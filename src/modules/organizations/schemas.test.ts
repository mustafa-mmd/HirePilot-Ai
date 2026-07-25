import { describe, expect, it } from "vitest";

import { organizationSchema, slugifyOrganizationName } from "@/modules/organizations/schemas";

describe("organization input", () => {
  it("creates stable URL slugs", () => {
    expect(slugifyOrganizationName("Müller & Sons, Inc.")).toBe("muller-sons-inc");
  });

  it("rejects unsafe slugs", () => {
    expect(organizationSchema.safeParse({ name: "Acme", slug: "../other-tenant" }).success).toBe(false);
  });

  it("accepts normalized organization data", () => {
    const result = organizationSchema.parse({ name: "  Acme Labs  ", slug: "acme-labs" });
    expect(result).toEqual({ name: "Acme Labs", slug: "acme-labs" });
  });
});
