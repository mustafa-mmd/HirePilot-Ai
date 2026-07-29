import { apiError, apiSuccess } from "@/lib/api-response";
import { assertSameOrigin, getRequestIp } from "@/lib/request-security";
import { removeAssessmentInvitation } from "@/modules/assessments/invitation-service";
import { requireOrganizationContext } from "@/modules/authorization/service";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ invitationId: string }> },
) {
  try {
    assertSameOrigin(request);
    const context = await requireOrganizationContext("assessments:manage");
    return apiSuccess(
      await removeAssessmentInvitation(
        context,
        (await params).invitationId,
        getRequestIp(request),
      ),
    );
  } catch (error) {
    return apiError(error);
  }
}
