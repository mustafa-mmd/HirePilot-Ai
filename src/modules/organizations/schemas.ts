import { z } from "zod";

export const organizationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use letters, numbers, and hyphens only."),
});

export const activeOrganizationSchema = z.object({
  organizationId: z.string().trim().min(1),
});

export const organizationSettingsSchema = z.object({
  name: z.string().trim().min(2).max(120),
  website: z.union([z.url(), z.literal("")]),
  industry: z.string().trim().max(100),
  size: z.string().trim().max(40),
  logo: z.union([z.url(), z.literal("")]),
  primaryColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  secondaryColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  privacyContactEmail: z.union([z.email(), z.literal("")]),
  retentionDays: z.number().int().min(30).max(2_555),
  assessmentSupportMessage: z.string().trim().min(20).max(2_000),
});

export type OrganizationInput = z.infer<typeof organizationSchema>;

export function slugifyOrganizationName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
