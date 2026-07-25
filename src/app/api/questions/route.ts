import { apiError, apiSuccess } from "@/lib/api-response";
import { assertSameOrigin, getRequestIp } from "@/lib/request-security";
import { requireOrganizationContext } from "@/modules/authorization/service";
import { createQuestion, listQuestions } from "@/modules/assessments/question-service";
import { questionInputSchema } from "@/modules/assessments/schemas";

export async function GET(request: Request) {
  try { const context = await requireOrganizationContext("assessments:read"); return apiSuccess(await listQuestions(context, new URL(request.url).searchParams.get("search") ?? "")); }
  catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try { assertSameOrigin(request); const context = await requireOrganizationContext("assessments:manage"); return apiSuccess(await createQuestion(context, questionInputSchema.parse(await request.json()), getRequestIp(request)), { status: 201 }); }
  catch (error) { return apiError(error); }
}
