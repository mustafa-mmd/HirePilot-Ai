import type { OrganizationRole } from "@/models/shared";

export const PERMISSIONS = [
  "organization:read",
  "organization:update",
  "members:read",
  "members:manage",
  "jobs:read",
  "jobs:manage",
  "candidates:read",
  "candidates:review",
  "candidates:manage",
  "assessments:read",
  "assessments:manage",
  "billing:manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const rolePermissions: Record<OrganizationRole, ReadonlySet<Permission>> = {
  owner: new Set(PERMISSIONS),
  admin: new Set(PERMISSIONS.filter((permission) => permission !== "billing:manage")),
  recruiter: new Set([
    "organization:read",
    "members:read",
    "jobs:read",
    "jobs:manage",
    "candidates:read",
    "candidates:review",
    "assessments:read",
    "assessments:manage",
  ]),
  reviewer: new Set([
    "organization:read",
    "jobs:read",
    "candidates:read",
    "candidates:review",
    "assessments:read",
  ]),
};

export function hasPermission(role: OrganizationRole, permission: Permission) {
  return rolePermissions[role].has(permission);
}
