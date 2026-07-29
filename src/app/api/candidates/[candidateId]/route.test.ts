import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/lib/errors";

vi.mock("@/modules/authorization/service", () => ({
  requireOrganizationContext: vi.fn(),
}));
vi.mock("@/modules/candidates/service", () => ({
  removeCandidateData: vi.fn(),
}));

import { DELETE } from "@/app/api/candidates/[candidateId]/route";
import { requireOrganizationContext } from "@/modules/authorization/service";
import { removeCandidateData } from "@/modules/candidates/service";

const candidateId = "507f1f77bcf86cd799439013";
const context = {
  userId: "507f1f77bcf86cd799439011",
  organizationId: "507f1f77bcf86cd799439012",
  organizationName: "Acme",
  organizationSlug: "acme",
  role: "recruiter" as const,
};

function removeRequest(scope: "assessment" | "candidate" | "invalid") {
  return new Request(`https://app.test/api/candidates/${candidateId}`, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scope }),
  });
}

describe("candidate data removal route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires candidate-management permission", async () => {
    vi.mocked(requireOrganizationContext).mockRejectedValue(
      new AppError("Forbidden", 403, "FORBIDDEN"),
    );

    const response = await DELETE(removeRequest("assessment"), {
      params: Promise.resolve({ candidateId }),
    });

    expect(response.status).toBe(403);
    expect(requireOrganizationContext).toHaveBeenCalledWith(
      "candidates:manage",
    );
    expect(removeCandidateData).not.toHaveBeenCalled();
  });

  it("passes the tenant context and assessment-only scope", async () => {
    vi.mocked(requireOrganizationContext).mockResolvedValue(context);
    vi.mocked(removeCandidateData).mockResolvedValue({
      id: candidateId,
      scope: "assessment",
      candidateRemoved: false,
      removed: {
        applications: 0,
        attempts: 1,
        answers: 2,
        invitations: 1,
      },
    });

    const response = await DELETE(removeRequest("assessment"), {
      params: Promise.resolve({ candidateId }),
    });

    expect(response.status).toBe(200);
    expect(removeCandidateData).toHaveBeenCalledWith(
      context,
      candidateId,
      { scope: "assessment" },
      "unknown",
    );
  });

  it("accepts full candidate deletion", async () => {
    vi.mocked(requireOrganizationContext).mockResolvedValue(context);
    vi.mocked(removeCandidateData).mockResolvedValue({
      id: candidateId,
      scope: "candidate",
      candidateRemoved: true,
      removed: {
        applications: 1,
        attempts: 1,
        answers: 2,
        invitations: 1,
      },
    });

    const response = await DELETE(removeRequest("candidate"), {
      params: Promise.resolve({ candidateId }),
    });

    expect(response.status).toBe(200);
    expect(removeCandidateData).toHaveBeenCalledWith(
      context,
      candidateId,
      { scope: "candidate" },
      "unknown",
    );
  });

  it("rejects unknown removal scopes", async () => {
    vi.mocked(requireOrganizationContext).mockResolvedValue(context);

    const response = await DELETE(removeRequest("invalid"), {
      params: Promise.resolve({ candidateId }),
    });

    expect(response.status).toBe(422);
    expect(removeCandidateData).not.toHaveBeenCalled();
  });
});
