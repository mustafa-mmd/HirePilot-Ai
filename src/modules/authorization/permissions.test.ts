import { describe, expect, it } from "vitest";

import { hasPermission } from "@/modules/authorization/permissions";

describe("organization permissions", () => {
  it("allows owners to manage billing and members", () => {
    expect(hasPermission("owner", "billing:manage")).toBe(true);
    expect(hasPermission("owner", "members:manage")).toBe(true);
  });

  it("prevents administrators from managing owner billing", () => {
    expect(hasPermission("admin", "billing:manage")).toBe(false);
    expect(hasPermission("admin", "members:manage")).toBe(true);
  });

  it("keeps reviewers read-focused", () => {
    expect(hasPermission("reviewer", "candidates:review")).toBe(true);
    expect(hasPermission("reviewer", "jobs:manage")).toBe(false);
    expect(hasPermission("reviewer", "members:manage")).toBe(false);
  });
});
