import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { assertSameOrigin, getRequestIp } from "@/lib/request-security";
import { updateOrganizationStatus } from "@/modules/admin/service";
import { requirePlatformAdmin } from "@/modules/authorization/service";

const statusSchema = z.object({
  status: z.enum(["active", "canceled", "past_due", "trialing"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ organizationId: string }> }
) {
  try {
    assertSameOrigin(request);
    const admin = await requirePlatformAdmin();
    const { organizationId } = await params;
    const body = await request.json();
    const { status } = statusSchema.parse(body);

    const result = await updateOrganizationStatus(
      admin.userId,
      organizationId,
      status,
      getRequestIp(request)
    );

    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
