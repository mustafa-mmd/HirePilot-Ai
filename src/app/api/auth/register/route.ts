import { apiError, apiSuccess } from "@/lib/api-response";
import { enforceAuthRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin, getRequestIp } from "@/lib/request-security";
import { registrationSchema } from "@/modules/auth/schemas";
import { registerUser } from "@/modules/auth/service";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await enforceAuthRateLimit(`register:${getRequestIp(request)}`);
    const input = registrationSchema.parse(await request.json());
    const user = await registerUser(input);
    return apiSuccess(user, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
