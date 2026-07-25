import { apiError, apiSuccess } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/request-security";
import { completeAttemptSchema } from "@/modules/attempts/schemas";
import { completeAssessmentAttempt } from "@/modules/attempts/service";

export async function POST(request: Request) {
  try { assertSameOrigin(request); const input = completeAttemptSchema.parse(await request.json()); return apiSuccess(await completeAssessmentAttempt(input.token, input.sessionId)); }
  catch (error) { return apiError(error); }
}
