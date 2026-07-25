import { apiError, apiSuccess } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/request-security";
import { ACTIVE_ORGANIZATION_COOKIE, requireAuthenticatedUser } from "@/modules/authorization/service";
import { teamInvitationTokenSchema } from "@/modules/team/schemas";
import { acceptTeamInvitation } from "@/modules/team/service";

export async function POST(request: Request) {
  try { assertSameOrigin(request); const user = await requireAuthenticatedUser(); const { token } = teamInvitationTokenSchema.transform((value) => ({ token: value })).parse((await request.json()).token); const result = await acceptTeamInvitation(token, user.id); const response = apiSuccess(result); response.cookies.set(ACTIVE_ORGANIZATION_COOKIE, result.organizationId, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 }); return response; }
  catch (error) { return apiError(error); }
}
