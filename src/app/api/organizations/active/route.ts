import { apiError, apiSuccess } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/request-security";
import { ACTIVE_ORGANIZATION_COOKIE, requireAuthenticatedUser } from "@/modules/authorization/service";
import { activeOrganizationSchema } from "@/modules/organizations/schemas";
import { verifyActiveMembership } from "@/modules/organizations/service";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireAuthenticatedUser();
    const { organizationId } = activeOrganizationSchema.parse(await request.json());
    await verifyActiveMembership(user.id, organizationId);

    const response = apiSuccess({ organizationId });
    response.cookies.set(ACTIVE_ORGANIZATION_COOKIE, organizationId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (error) {
    return apiError(error);
  }
}
