import { apiError, apiSuccess } from "@/lib/api-response";
import { assertSameOrigin, getRequestIp } from "@/lib/request-security";
import { requireOrganizationContext } from "@/modules/authorization/service";
import { organizationSettingsSchema } from "@/modules/organizations/schemas";
import { getOrganizationSettings, updateOrganizationSettings } from "@/modules/organizations/service";
export async function GET() { try { const context = await requireOrganizationContext("organization:read"); return apiSuccess(await getOrganizationSettings(context)); } catch (error) { return apiError(error); } }
export async function PATCH(request: Request) { try { assertSameOrigin(request); const context = await requireOrganizationContext("organization:update"); return apiSuccess(await updateOrganizationSettings(context, organizationSettingsSchema.parse(await request.json()), getRequestIp(request))); } catch (error) { return apiError(error); } }
