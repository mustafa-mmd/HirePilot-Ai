import { apiError, apiSuccess } from "@/lib/api-response";
import { enforceCandidateRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin, getRequestIp } from "@/lib/request-security";
import { hashAssessmentInvitationToken } from "@/modules/assessments/invitation-token";
import { requestAssessmentOtp } from "@/modules/attempts/otp";
import { otpRequestSchema } from "@/modules/attempts/schemas";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = otpRequestSchema.parse(await request.json());
    await enforceCandidateRateLimit(`otp:${hashAssessmentInvitationToken(input.token).slice(0, 20)}:${getRequestIp(request)}`);
    return apiSuccess(await requestAssessmentOtp(input.token, input.email));
  } catch (error) { return apiError(error); }
}
