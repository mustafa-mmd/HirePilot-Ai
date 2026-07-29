import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/lib/errors";

vi.mock("@/modules/authorization/service", () => ({
  requireOrganizationContext: vi.fn(),
}));
vi.mock("@/modules/team/service", () => ({
  removeMembership: vi.fn(),
  revokeTeamInvitation: vi.fn(),
  updateMembership: vi.fn(),
}));

import { DELETE as removeMember } from "@/app/api/team/[membershipId]/route";
import { DELETE as cancelInvitation } from "@/app/api/team/invitations/[invitationId]/route";
import { requireOrganizationContext } from "@/modules/authorization/service";
import {
  removeMembership,
  revokeTeamInvitation,
} from "@/modules/team/service";

const context = {
  userId: "507f1f77bcf86cd799439011",
  organizationId: "507f1f77bcf86cd799439012",
  organizationName: "Acme",
  organizationSlug: "acme",
  role: "owner" as const,
};

describe("team removal routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires member-management permission before removing a member", async () => {
    vi.mocked(requireOrganizationContext).mockRejectedValue(
      new AppError("Forbidden", 403, "FORBIDDEN"),
    );

    const response = await removeMember(
      new Request(
        "https://app.test/api/team/507f1f77bcf86cd799439013",
        { method: "DELETE" },
      ),
      {
        params: Promise.resolve({
          membershipId: "507f1f77bcf86cd799439013",
        }),
      },
    );

    expect(response.status).toBe(403);
    expect(removeMembership).not.toHaveBeenCalled();
  });

  it("passes tenant context into member removal", async () => {
    vi.mocked(requireOrganizationContext).mockResolvedValue(context);
    vi.mocked(removeMembership).mockResolvedValue({
      id: "507f1f77bcf86cd799439013",
      removed: true,
    });

    const response = await removeMember(
      new Request(
        "https://app.test/api/team/507f1f77bcf86cd799439013",
        { method: "DELETE" },
      ),
      {
        params: Promise.resolve({
          membershipId: "507f1f77bcf86cd799439013",
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(requireOrganizationContext).toHaveBeenCalledWith("members:manage");
    expect(removeMembership).toHaveBeenCalledWith(
      context,
      "507f1f77bcf86cd799439013",
      "unknown",
    );
  });

  it("passes tenant context into invitation cancellation", async () => {
    vi.mocked(requireOrganizationContext).mockResolvedValue(context);
    vi.mocked(revokeTeamInvitation).mockResolvedValue({
      id: "507f1f77bcf86cd799439014",
      status: "revoked",
    });

    const response = await cancelInvitation(
      new Request(
        "https://app.test/api/team/invitations/507f1f77bcf86cd799439014",
        { method: "DELETE" },
      ),
      {
        params: Promise.resolve({
          invitationId: "507f1f77bcf86cd799439014",
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(requireOrganizationContext).toHaveBeenCalledWith("members:manage");
    expect(revokeTeamInvitation).toHaveBeenCalledWith(
      context,
      "507f1f77bcf86cd799439014",
      "unknown",
    );
  });
});
