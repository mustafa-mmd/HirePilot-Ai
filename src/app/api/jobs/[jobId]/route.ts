import { apiError, apiSuccess } from "@/lib/api-response";
import { assertSameOrigin, getRequestIp } from "@/lib/request-security";
import { requireOrganizationContext } from "@/modules/authorization/service";
import { deleteDraftJob, getTenantJob, updateJob } from "@/modules/jobs/service";

type RouteContext = { params: Promise<{ jobId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try { const context = await requireOrganizationContext("jobs:read"); return apiSuccess(await getTenantJob(context, (await params).jobId)); }
  catch (error) { return apiError(error); }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try { assertSameOrigin(request); const context = await requireOrganizationContext("jobs:manage"); return apiSuccess(await updateJob(context, (await params).jobId, await request.json(), getRequestIp(request))); }
  catch (error) { return apiError(error); }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try { assertSameOrigin(request); const context = await requireOrganizationContext("jobs:manage"); await deleteDraftJob(context, (await params).jobId, getRequestIp(request)); return apiSuccess({ deleted: true }); }
  catch (error) { return apiError(error); }
}
