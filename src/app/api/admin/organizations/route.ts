import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { assertSameOrigin, getRequestIp } from "@/lib/request-security";
import { adminRegisterOrganization } from "@/modules/admin/service";
import { requirePlatformAdmin } from "@/modules/authorization/service";

const registerSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  ownerEmail: z.string().email(),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requirePlatformAdmin();
    const body = await request.json();
    const input = registerSchema.parse(body);

    const result = await adminRegisterOrganization(
      admin.userId,
      input.name,
      input.slug,
      input.ownerEmail,
      getRequestIp(request)
    );

    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
