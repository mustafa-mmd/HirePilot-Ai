import type { SchemaOptions } from "mongoose";

export const baseSchemaOptions = {
  timestamps: true,
  versionKey: false,
  strict: "throw",
  toJSON: {
    virtuals: true,
    transform: (_document: unknown, returned: Record<string, unknown>) => {
      returned.id = String(returned._id);
      delete returned._id;
      delete returned.passwordHash;
      return returned;
    },
  },
} satisfies SchemaOptions;

export const GLOBAL_ROLES = ["user", "platform_admin"] as const;
export type GlobalRole = (typeof GLOBAL_ROLES)[number];

export const ORGANIZATION_ROLES = [
  "owner",
  "admin",
  "recruiter",
  "reviewer",
] as const;
export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export const MEMBERSHIP_STATUSES = ["active", "suspended"] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];
