import { describe, expect, it } from "vitest";

import { attemptExpiry, hasExpired, questionExpiry, remainingSeconds } from "@/modules/attempts/timers";

describe("server assessment timers", () => {
  const start = new Date("2026-01-01T00:00:00.000Z");
  it("caps an attempt at the invitation expiration", () => expect(attemptExpiry(start, 60, new Date("2026-01-01T00:30:00.000Z")).toISOString()).toBe("2026-01-01T00:30:00.000Z"));
  it("includes preparation time and caps questions at the attempt", () => expect(questionExpiry(start, 30, 90, new Date("2026-01-01T00:01:00.000Z")).toISOString()).toBe("2026-01-01T00:01:00.000Z"));
  it("never returns a negative countdown", () => { expect(hasExpired(start, start)).toBe(true); expect(remainingSeconds(start, new Date(start.getTime() + 1_000))).toBe(0); });
});
