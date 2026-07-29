import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/lib/errors";

vi.mock("@/modules/authorization/service", () => ({
  requireOrganizationContext: vi.fn(),
}));
vi.mock("@/modules/assessments/invitation-service", () => ({
  cancelAssessmentInvitation: vi.fn(),
}));

import { DELETE } from "@/app/api/assessment-invitations/[invitationId]/route";
import { cancelAssessmentInvitation } from "@/modules/assessments/invitation-service";
import { requireOrganizationContext } from "@/modules/authorization/service";

const context = {
  userId: "507f1f77bcf86cd799439011",
  organizationId: "507f1f77bcf86cd799439012",
  organizationName: "Acme",
  organizationSlug: "acme",
  role: "recruiter" as const,
};

describe("assessment invitation cancellation route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires assessment-management permission", async () => {
    vi.mocked(requireOrganizationContext).mockRejectedValue(
      new AppError("Forbidden", 403, "FORBIDDEN"),
    );

    const response = await DELETE(
      new Request(
        "https://app.test/api/assessment-invitations/507f1f77bcf86cd799439013",
        { method: "DELETE" },
      ),
      {
        params: Promise.resolve({
          invitationId: "507f1f77bcf86cd799439013",
        }),
      },
    );

    expect(response.status).toBe(403);
    expect(cancelAssessmentInvitation).not.toHaveBeenCalled();
  });

  it("passes tenant context into cancellation", async () => {
    vi.mocked(requireOrganizationContext).mockResolvedValue(context);
    vi.mocked(cancelAssessmentInvitation).mockResolvedValue({
      id: "507f1f77bcf86cd799439013",
      cancelled: true,
    });

    const response = await DELETE(
      new Request(
        "https://app.test/api/assessment-invitations/507f1f77bcf86cd799439013",
        { method: "DELETE" },
      ),
      {
        params: Promise.resolve({
          invitationId: "507f1f77bcf86cd799439013",
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(requireOrganizationContext).toHaveBeenCalledWith(
      "assessments:manage",
    );
    expect(cancelAssessmentInvitation).toHaveBeenCalledWith(
      context,
      "507f1f77bcf86cd799439013",
      "unknown",
    );
  });
});
