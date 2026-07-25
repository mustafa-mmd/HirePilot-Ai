import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { assertSameOrigin, getRequestIp } from "@/lib/request-security";
import { updateOrganizationPlan } from "@/modules/admin/service";
import { requirePlatformAdmin } from "@/modules/authorization/service";
import { SUBSCRIPTION_PLANS } from "@/models/subscription.model";
export async function PATCH(request: Request, { params }: { params: Promise<{ organizationId: string }> }) { try { assertSameOrigin(request); const admin = await requirePlatformAdmin(); const input = z.object({ plan: z.enum(SUBSCRIPTION_PLANS) }).parse(await request.json()); return apiSuccess(await updateOrganizationPlan(admin.userId, (await params).organizationId, input.plan, getRequestIp(request))); } catch (error) { return apiError(error); } }
