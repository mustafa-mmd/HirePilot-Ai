import { apiError, apiSuccess } from "@/lib/api-response";
import { enforceAiRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin, getRequestIp } from "@/lib/request-security";
import { analyzeApplication } from "@/modules/ai/analysis-service";
import { requireOrganizationContext } from "@/modules/authorization/service";

export const maxDuration = 60;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  try {
    assertSameOrigin(request);
    const context = await requireOrganizationContext("candidates:review");
    await enforceAiRateLimit(`${context.organizationId}:${context.userId}`);
    return apiSuccess(
      await analyzeApplication(context, (await params).applicationId, getRequestIp(request)),
    );
  } catch (error) {
    return apiError(error);
  }
}
