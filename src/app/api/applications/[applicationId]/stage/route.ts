import { apiError, apiSuccess } from "@/lib/api-response";
import { assertSameOrigin, getRequestIp } from "@/lib/request-security";
import { stageUpdateSchema } from "@/modules/applications/schemas";
import { updateApplicationStage } from "@/modules/applications/service";
import { requireOrganizationContext } from "@/modules/authorization/service";

export async function PATCH(request: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  try {
    assertSameOrigin(request);
    const context = await requireOrganizationContext("candidates:review");
    const { stage } = stageUpdateSchema.parse(await request.json());
    return apiSuccess(await updateApplicationStage(context, (await params).applicationId, stage, getRequestIp(request)));
  } catch (error) { return apiError(error); }
}
