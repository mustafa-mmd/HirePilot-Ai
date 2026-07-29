import { apiError, apiSuccess } from "@/lib/api-response";
import { assertSameOrigin, getRequestIp } from "@/lib/request-security";
import { requireOrganizationContext } from "@/modules/authorization/service";
import { candidateRemovalSchema } from "@/modules/candidates/schemas";
import { removeCandidateData } from "@/modules/candidates/service";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ candidateId: string }> },
) {
  try {
    assertSameOrigin(request);
    const context = await requireOrganizationContext("candidates:manage");
    const input = candidateRemovalSchema.parse(await request.json());
    return apiSuccess(
      await removeCandidateData(
        context,
        (await params).candidateId,
        input,
        getRequestIp(request),
      ),
    );
  } catch (error) {
    return apiError(error);
  }
}
