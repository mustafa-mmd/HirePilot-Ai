import { compare } from "bcryptjs";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { connectToDatabase } from "@/lib/database";
import { enforceAuthRateLimit } from "@/lib/rate-limit";
import { getSafeInternalPath } from "@/lib/safe-redirect";
import { User } from "@/models/user.model";
import { credentialsSchema } from "@/modules/auth/schemas";

const providers: NextAuthConfig["providers"] = [
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(rawCredentials, request) {
      const credentials = credentialsSchema.safeParse(rawCredentials);
      if (!credentials.success) return null;

      const forwardedFor = request.headers.get("x-forwarded-for");
      const identifier = forwardedFor?.split(",")[0]?.trim() ?? credentials.data.email;
      await enforceAuthRateLimit(`credentials:${identifier}`);
      await connectToDatabase();

      const user = await User.findOne({ email: credentials.data.email })
        .select("+passwordHash")
        .lean();

      if (!user?.passwordHash) return null;
      const passwordMatches = await compare(credentials.data.password, user.passwordHash);
      if (!passwordMatches) return null;

      return {
        id: String(user._id),
        name: user.name,
        email: user.email,
        image: user.image,
      };
    },
  }),
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(Google);
}

export const authConfig = {
  providers,
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  trustHost: true,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;
      if (!user.email) return false;

      // Emails listed in PLATFORM_ADMIN_EMAILS are always platform admins.
      // This is the self-healing bootstrap — even if something resets the role,
      // the next Google login will re-promote automatically.
      const adminEmails = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
      const isPlatformAdmin = adminEmails.includes(user.email.toLowerCase());

      await connectToDatabase();
      const storedUser = await User.findOne({ email: user.email.toLowerCase() }).lean();

      if (storedUser) {
        // Build the $set payload. Use a raw MongoDB operator so Mongoose schema
        // defaults (globalRole: "user") can NEVER overwrite what we explicitly set.
        const setPayload: Record<string, unknown> = {
          name: user.name ?? user.email,
          ...(user.image ? { image: user.image } : {}),
        };
        // Promote to platform_admin if in the allow-list
        if (isPlatformAdmin) setPayload.globalRole = "platform_admin";

        await User.updateOne({ _id: storedUser._id }, { $set: setPayload });
        user.id = String(storedUser._id);
      } else {
        const newUser = await User.create({
          name: user.name ?? user.email,
          email: user.email.toLowerCase(),
          image: user.image ?? undefined,
          emailVerified: new Date(),
          globalRole: isPlatformAdmin ? "platform_admin" : "user",
        });
        user.id = String(newUser._id);
      }
      return true;
    },
    async jwt({ token, user, account }) {
      // Only runs on sign-in when `user` is populated
      if (user?.id && account) {
        token.userId = user.id;
        // Force-set email from the OAuth profile — don't rely on NextAuth defaults
        if (user.email) token.email = user.email.toLowerCase();

        // Determine the globalRole for this token.
        // PLATFORM_ADMIN_EMAILS is the authoritative source — never depends on DB.
        const adminEmails = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
          .split(",")
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean);

        if (token.email && adminEmails.includes(token.email)) {
          token.globalRole = "platform_admin";
        } else {
          // For regular users check DB role
          await connectToDatabase();
          const stored = await User.findOne({ _id: user.id }).select("globalRole").lean();
          token.globalRole = stored?.globalRole ?? "user";
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.userId) session.user.id = String(token.userId);
        // Explicitly forward email so session.user.email is never null
        if (token.email) session.user.email = token.email;
        // Forward globalRole so requirePlatformAdmin can check it without a DB call
        if (token.globalRole) session.user.globalRole = String(token.globalRole);
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return new URL(getSafeInternalPath(url, "/"), baseUrl).toString();
      }

      try {
        if (new URL(url).origin === baseUrl) return url;
      } catch {
        // Invalid callback values fall back to the application root.
      }
      return baseUrl;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
