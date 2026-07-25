import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { assertSameOrigin, getRequestIp } from "@/lib/request-security";
import { updateUserGlobalRole } from "@/modules/admin/service";
import { requirePlatformAdmin } from "@/modules/authorization/service";

const roleSchema = z.object({
  role: z.enum(["user", "platform_admin"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    assertSameOrigin(request);
    const admin = await requirePlatformAdmin();
    const { userId } = await params;
    const body = await request.json();
    const { role } = roleSchema.parse(body);

    const result = await updateUserGlobalRole(
      admin.userId,
      userId,
      role,
      getRequestIp(request)
    );

    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
