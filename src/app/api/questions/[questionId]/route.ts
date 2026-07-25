import { apiError, apiSuccess } from "@/lib/api-response";
import { assertSameOrigin, getRequestIp } from "@/lib/request-security";
import { requireOrganizationContext } from "@/modules/authorization/service";
import { deleteQuestion, getQuestion, updateQuestion } from "@/modules/assessments/question-service";

type RouteContext = { params: Promise<{ questionId: string }> };
export async function GET(_request: Request, { params }: RouteContext) { try { const context = await requireOrganizationContext("assessments:read"); return apiSuccess(await getQuestion(context, (await params).questionId)); } catch (error) { return apiError(error); } }
export async function PATCH(request: Request, { params }: RouteContext) { try { assertSameOrigin(request); const context = await requireOrganizationContext("assessments:manage"); return apiSuccess(await updateQuestion(context, (await params).questionId, await request.json(), getRequestIp(request))); } catch (error) { return apiError(error); } }
export async function DELETE(request: Request, { params }: RouteContext) { try { assertSameOrigin(request); const context = await requireOrganizationContext("assessments:manage"); await deleteQuestion(context, (await params).questionId, getRequestIp(request)); return apiSuccess({ deleted: true }); } catch (error) { return apiError(error); } }
