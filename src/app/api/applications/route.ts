import { apiError, apiSuccess } from "@/lib/api-response";
import { enforceApplicationRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin, getRequestIp } from "@/lib/request-security";
import { applicationInputSchema } from "@/modules/applications/schemas";
import { submitApplication } from "@/modules/applications/service";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const ip = getRequestIp(request);
    await enforceApplicationRateLimit(`submit:${ip}`);
    const input = applicationInputSchema.parse(await request.json());
    await enforceApplicationRateLimit(`email:${input.email}`);
    return apiSuccess(await submitApplication(input), { status: 201 });
  } catch (error) { return apiError(error); }
}
