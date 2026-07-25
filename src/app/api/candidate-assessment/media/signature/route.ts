import { apiError, apiSuccess } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/request-security";
import { mediaSignatureSchema } from "@/modules/attempts/schemas";
import { createCandidateMediaSignature } from "@/modules/media/service";

export async function POST(request: Request) {
  try { assertSameOrigin(request); return apiSuccess(await createCandidateMediaSignature(mediaSignatureSchema.parse(await request.json()))); }
  catch (error) { return apiError(error); }
}
