import { apiError, apiSuccess } from "@/lib/api-response";
import { enforceCandidateRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin, getRequestIp } from "@/lib/request-security";
import { hashAssessmentInvitationToken } from "@/modules/assessments/invitation-token";
import { verifyAssessmentOtp } from "@/modules/attempts/otp";
import { otpVerifySchema } from "@/modules/attempts/schemas";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = otpVerifySchema.parse(await request.json());
    await enforceCandidateRateLimit(`verify:${hashAssessmentInvitationToken(input.token).slice(0, 20)}:${getRequestIp(request)}`);
    return apiSuccess(await verifyAssessmentOtp(input.token, input.code));
  } catch (error) { return apiError(error); }
}
