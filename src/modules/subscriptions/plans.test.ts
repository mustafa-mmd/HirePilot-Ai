import { describe, expect, it } from "vitest";
import { currentBillingPeriod, PLAN_LIMITS } from "@/modules/subscriptions/plans";
describe("subscription plans", () => {
  it("uses UTC calendar-month boundaries", () => { const period = currentBillingPeriod(new Date("2026-12-31T23:59:59Z")); expect(period.start.toISOString()).toBe("2026-12-01T00:00:00.000Z"); expect(period.end.toISOString()).toBe("2027-01-01T00:00:00.000Z"); });
  it("increases every capacity on higher plans", () => { for (const key of Object.keys(PLAN_LIMITS.starter) as Array<keyof typeof PLAN_LIMITS.starter>) { expect(PLAN_LIMITS.growth[key]).toBeGreaterThan(PLAN_LIMITS.starter[key]); expect(PLAN_LIMITS.business[key]).toBeGreaterThan(PLAN_LIMITS.growth[key]); } });
});
