import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";
vi.mock("@/modules/authorization/service", () => ({ requirePlatformAdmin: vi.fn() }));
vi.mock("@/modules/admin/service", () => ({ updateOrganizationPlan: vi.fn() }));
import { requirePlatformAdmin } from "@/modules/authorization/service";
import { updateOrganizationPlan } from "@/modules/admin/service";
import { PATCH } from "@/app/api/admin/organizations/[organizationId]/plan/route";
describe("platform plan route", () => {
  beforeEach(() => vi.clearAllMocks());
  it("blocks non-platform administrators", async () => { vi.mocked(requirePlatformAdmin).mockRejectedValue(new AppError("Forbidden", 403, "PLATFORM_ADMIN_REQUIRED")); const response = await PATCH(new Request("https://app.test/api/admin/organizations/507f1f77bcf86cd799439011/plan", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan: "growth" }) }), { params: Promise.resolve({ organizationId: "507f1f77bcf86cd799439011" }) }); expect(response.status).toBe(403); expect(updateOrganizationPlan).not.toHaveBeenCalled(); });
});
