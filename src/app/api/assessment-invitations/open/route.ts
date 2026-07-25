import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/request-security";
import { markInvitationOpened } from "@/modules/assessments/invitation-service";

const schema = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) });
export async function POST(request: Request) { try { assertSameOrigin(request); const { token } = schema.parse(await request.json()); return apiSuccess(await markInvitationOpened(token)); } catch (error) { return apiError(error); } }
