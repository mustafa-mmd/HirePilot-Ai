import "server-only";

import { cookies } from "next/headers";
import { Types } from "mongoose";

import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/database";
import { AppError } from "@/lib/errors";
import { Membership } from "@/models/membership.model";
import { Organization } from "@/models/organization.model";
import { User } from "@/models/user.model";
import type { OrganizationRole } from "@/models/shared";
import { hasPermission, type Permission } from "@/modules/authorization/permissions";

export const ACTIVE_ORGANIZATION_COOKIE = "hp_active_organization";

export type AuthorizationContext = {
  userId: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  organizationLogo?: string;
  role: OrganizationRole;
};

export async function requireAuthenticatedUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AppError("Authentication required.", 401, "UNAUTHENTICATED");
  }
  return session.user;
}

export async function getActiveOrganizationContext(): Promise<AuthorizationContext | null> {
  const user = await requireAuthenticatedUser();
  const cookieStore = await cookies();
  const organizationId = cookieStore.get(ACTIVE_ORGANIZATION_COOKIE)?.value;

  if (!organizationId || !Types.ObjectId.isValid(organizationId)) return null;
  await connectToDatabase();

  const membership = await Membership.findOne({
    organizationId,
    userId: user.id,
    status: "active",
  })
    .select("organizationId role")
    .lean();

  if (!membership) return null;

  const organization = await Organization.findOne({ _id: organizationId })
    .select("name slug logo")
    .lean();
  if (!organization) return null;

  return {
    userId: user.id,
    organizationId,
    organizationName: organization.name,
    organizationSlug: organization.slug,
    organizationLogo: organization.logo,
    role: membership.role,
  };
}

export async function requireOrganizationContext(permission?: Permission) {
  const context = await getActiveOrganizationContext();
  if (!context) {
    throw new AppError(
      "Select an active organization to continue.",
      412,
      "ACTIVE_ORGANIZATION_REQUIRED",
    );
  }

  if (permission && !hasPermission(context.role, permission)) {
    throw new AppError("You do not have permission for this action.", 403, "FORBIDDEN");
  }

  return context;
}

export async function requirePlatformAdmin() {
  const user = await requireAuthenticatedUser();

  // Layer 1: globalRole is baked into the JWT at sign-in and forwarded to session.
  // This is the fastest check — no DB, no env parsing.
  if (user.globalRole === "platform_admin") {
    return { userId: user.id, name: user.name ?? "", email: user.email ?? "" };
  }

  // Layer 2: PLATFORM_ADMIN_EMAILS env var — handles cases where the JWT was
  // issued before the role was set (e.g., first login after promotion).
  const adminEmails = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (user.email && adminEmails.includes(user.email.toLowerCase())) {
    return { userId: user.id, name: user.name ?? "", email: user.email };
  }

  // Layer 3: DB fallback for users promoted via the admin panel
  await connectToDatabase();
  const stored = await User.findOne({ _id: user.id, globalRole: "platform_admin" })
    .select("name email globalRole")
    .lean();
  if (!stored) throw new AppError("Platform administrator access required.", 403, "PLATFORM_ADMIN_REQUIRED");
  return { userId: String(stored._id), name: stored.name, email: stored.email };
}
