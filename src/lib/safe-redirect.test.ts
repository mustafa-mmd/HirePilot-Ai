import { describe, expect, it } from "vitest";

import { getSafeInternalPath } from "@/lib/safe-redirect";

describe("getSafeInternalPath", () => {
  it("keeps valid application paths, queries, and fragments", () => {
    expect(getSafeInternalPath("/team/join/token?source=email#accept", "/dashboard"))
      .toBe("/team/join/token?source=email#accept");
  });

  it.each([
    "https://attacker.example/path",
    "//attacker.example/path",
    "/\\attacker.example/path",
    "dashboard",
    "/team/join/\u0000token",
  ])("rejects unsafe redirect value %s", (value) => {
    expect(getSafeInternalPath(value, "/dashboard")).toBe("/dashboard");
  });

  it("uses the fallback when no callback is provided", () => {
    expect(getSafeInternalPath(undefined, "/onboarding")).toBe("/onboarding");
  });
});
