import { apiError, apiSuccess } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/request-security";
import { answerInputSchema } from "@/modules/attempts/schemas";
import { saveCandidateAnswer } from "@/modules/attempts/service";

export async function PUT(request: Request) {
  try { assertSameOrigin(request); return apiSuccess(await saveCandidateAnswer(answerInputSchema.parse(await request.json()))); }
  catch (error) { return apiError(error); }
}
