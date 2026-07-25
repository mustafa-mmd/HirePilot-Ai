import { apiError, apiSuccess } from "@/lib/api-response";
import { enforceAiRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin, getRequestIp } from "@/lib/request-security";
import { requireOrganizationContext } from "@/modules/authorization/service";
import { evaluateAssessmentAttempt } from "@/modules/reports/evaluation-service";

export async function POST(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  try { assertSameOrigin(request); const context = await requireOrganizationContext("candidates:review"); await enforceAiRateLimit(`${context.organizationId}:${context.userId}:assessment`); return apiSuccess(await evaluateAssessmentAttempt(context, (await params).attemptId, getRequestIp(request))); }
  catch (error) { return apiError(error); }
}
