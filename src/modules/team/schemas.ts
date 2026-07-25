import { z } from "zod";

export const teamInvitationSchema = z.object({ email: z.email().max(254).transform((value) => value.toLowerCase()), role: z.enum(["admin", "recruiter", "reviewer"]) });
export const teamInvitationTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const membershipUpdateSchema = z.object({ role: z.enum(["admin", "recruiter", "reviewer"]).optional(), status: z.enum(["active", "suspended"]).optional() }).refine((value) => value.role || value.status, "Choose a membership change.");
