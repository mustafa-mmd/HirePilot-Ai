import { apiError, apiSuccess } from "@/lib/api-response";
import { enforceCandidateRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin, getRequestIp } from "@/lib/request-security";
import { codeExecutionSchema } from "@/modules/attempts/schemas";
import { executeCandidateCode } from "@/modules/coding/judge0";

export async function POST(request: Request) {
  try { assertSameOrigin(request); const input = codeExecutionSchema.parse(await request.json()); await enforceCandidateRateLimit(`code:${input.token.slice(0, 12)}:${getRequestIp(request)}`); return apiSuccess(await executeCandidateCode(input)); }
  catch (error) { return apiError(error); }
}
