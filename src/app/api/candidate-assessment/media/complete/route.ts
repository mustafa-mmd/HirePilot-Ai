import { apiError, apiSuccess } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/request-security";
import { integrityMediaCompleteSchema } from "@/modules/attempts/schemas";
import { registerIntegrityMedia } from "@/modules/media/service";

export async function POST(request: Request) {
  try { assertSameOrigin(request); return apiSuccess(await registerIntegrityMedia(integrityMediaCompleteSchema.parse(await request.json())), { status: 201 }); }
  catch (error) { return apiError(error); }
}
