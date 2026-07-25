import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/lib/errors";

vi.mock("@/modules/authorization/service", () => ({ requireOrganizationContext: vi.fn() }));
vi.mock("@/modules/jobs/service", () => ({ createJob: vi.fn(), listTenantJobs: vi.fn() }));

import { requireOrganizationContext } from "@/modules/authorization/service";
import { listTenantJobs } from "@/modules/jobs/service";
import { GET } from "@/app/api/jobs/route";

describe("protected jobs route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when the server authorization layer rejects the request", async () => {
    vi.mocked(requireOrganizationContext).mockRejectedValue(new AppError("Authentication required.", 401, "UNAUTHENTICATED"));
    const response = await GET(new Request("https://app.test/api/jobs"));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ success: false, error: { code: "UNAUTHENTICATED" } });
  });

  it("passes tenant context into the service", async () => {
    const context = { userId: "507f1f77bcf86cd799439011", organizationId: "507f1f77bcf86cd799439012", organizationName: "Acme", organizationSlug: "acme", role: "recruiter" as const };
    vi.mocked(requireOrganizationContext).mockResolvedValue(context);
    vi.mocked(listTenantJobs).mockResolvedValue([]);
    const response = await GET(new Request("https://app.test/api/jobs?search=engineer"));
    expect(response.status).toBe(200);
    expect(listTenantJobs).toHaveBeenCalledWith(context, "engineer");
  });
});
