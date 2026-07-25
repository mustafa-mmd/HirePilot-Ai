import { apiError, apiSuccess } from "@/lib/api-response";
import { requireOrganizationContext } from "@/modules/authorization/service";
import { listCandidates } from "@/modules/candidates/service";

export async function GET(request: Request) {
  try {
    const context = await requireOrganizationContext("candidates:read");
    const search = new URL(request.url).searchParams.get("search") ?? "";
    return apiSuccess(await listCandidates(context, search));
  } catch (error) { return apiError(error); }
}
