import { apiError, apiSuccess } from "@/lib/api-response";
import { assertSameOrigin, getRequestIp } from "@/lib/request-security";
import { requireOrganizationContext } from "@/modules/authorization/service";
import { jobInputSchema } from "@/modules/jobs/schemas";
import { createJob, listTenantJobs } from "@/modules/jobs/service";

export async function GET(request: Request) {
  try {
    const context = await requireOrganizationContext("jobs:read");
    const search = new URL(request.url).searchParams.get("search") ?? "";
    return apiSuccess(await listTenantJobs(context, search));
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const context = await requireOrganizationContext("jobs:manage");
    const input = jobInputSchema.parse(await request.json());
    return apiSuccess(await createJob(context, input, getRequestIp(request)), { status: 201 });
  } catch (error) { return apiError(error); }
}
