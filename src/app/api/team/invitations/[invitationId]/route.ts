import { apiError, apiSuccess } from "@/lib/api-response";
import { assertSameOrigin, getRequestIp } from "@/lib/request-security";
import { requireOrganizationContext } from "@/modules/authorization/service";
import { revokeTeamInvitation } from "@/modules/team/service";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ invitationId: string }> },
) {
  try {
    assertSameOrigin(request);
    const context = await requireOrganizationContext("members:manage");
    return apiSuccess(
      await revokeTeamInvitation(
        context,
        (await params).invitationId,
        getRequestIp(request),
      ),
    );
  } catch (error) {
    return apiError(error);
  }
}
