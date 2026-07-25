import { apiError, apiSuccess } from "@/lib/api-response";
import { assertSameOrigin, getRequestIp } from "@/lib/request-security";
import { requireOrganizationContext } from "@/modules/authorization/service";
import { addRecruiterNote } from "@/modules/reports/report-service";
import { recruiterNoteSchema } from "@/modules/reports/schemas";

export async function POST(request: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  try { assertSameOrigin(request); const context = await requireOrganizationContext("candidates:review"); const input = recruiterNoteSchema.parse(await request.json()); return apiSuccess(await addRecruiterNote(context, (await params).applicationId, input.text, getRequestIp(request)), { status: 201 }); }
  catch (error) { return apiError(error); }
}
