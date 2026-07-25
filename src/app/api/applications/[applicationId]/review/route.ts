import { apiError, apiSuccess } from "@/lib/api-response";
import { assertSameOrigin, getRequestIp } from "@/lib/request-security";
import { markApplicationEvaluationReviewed } from "@/modules/ai/analysis-service";
import { requireOrganizationContext } from "@/modules/authorization/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  try {
    assertSameOrigin(request);
    const context = await requireOrganizationContext("candidates:review");
    return apiSuccess(await markApplicationEvaluationReviewed(context, (await params).applicationId, getRequestIp(request)));
  } catch (error) {
    return apiError(error);
  }
}
