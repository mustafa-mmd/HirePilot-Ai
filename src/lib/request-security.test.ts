import { describe, expect, it } from "vitest";

import { AppError } from "@/lib/errors";
import { assertSameOrigin } from "@/lib/request-security";

describe("same-origin mutation protection", () => {
  it("accepts same-origin requests", () => {
    const request = new Request("https://app.hirepilot.test/api/organizations", {
      headers: { origin: "https://app.hirepilot.test" },
    });
    expect(() => assertSameOrigin(request)).not.toThrow();
  });

  it("rejects cross-origin requests", () => {
    const request = new Request("https://app.hirepilot.test/api/organizations", {
      headers: { origin: "https://attacker.test" },
    });
    expect(() => assertSameOrigin(request)).toThrowError(AppError);
  });
});
