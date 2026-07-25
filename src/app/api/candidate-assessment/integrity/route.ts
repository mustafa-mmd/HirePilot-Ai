import { apiError, apiSuccess } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/request-security";
import { integrityEventInputSchema } from "@/modules/attempts/schemas";
import { recordIntegrityEvent } from "@/modules/attempts/service";

export async function POST(request: Request) {
  try { assertSameOrigin(request); return apiSuccess(await recordIntegrityEvent(integrityEventInputSchema.parse(await request.json())), { status: 201 }); }
  catch (error) { return apiError(error); }
}
