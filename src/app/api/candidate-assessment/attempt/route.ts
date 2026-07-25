import { apiError, apiSuccess } from "@/lib/api-response";
import { enforceCandidateRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin, getRequestIp } from "@/lib/request-security";
import { getCandidateAssessmentSession, startAssessmentAttempt } from "@/modules/attempts/service";
import { browserSessionSchema, invitationTokenSchema, startAttemptSchema } from "@/modules/attempts/schemas";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = invitationTokenSchema.parse(url.searchParams.get("token"));
    const sessionId = browserSessionSchema.parse(url.searchParams.get("sessionId"));
    await enforceCandidateRateLimit(`session:${token.slice(0, 12)}:${getRequestIp(request)}`);
    return apiSuccess(await getCandidateAssessmentSession(token, sessionId));
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = startAttemptSchema.parse(await request.json());
    await enforceCandidateRateLimit(`start:${input.token.slice(0, 12)}:${getRequestIp(request)}`);
    return apiSuccess(await startAssessmentAttempt(input, getRequestIp(request)), { status: 201 });
  } catch (error) { return apiError(error); }
}
