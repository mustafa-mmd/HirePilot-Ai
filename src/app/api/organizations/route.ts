import { apiError, apiSuccess } from "@/lib/api-response";
import { assertSameOrigin, getRequestIp } from "@/lib/request-security";
import { ACTIVE_ORGANIZATION_COOKIE, requireAuthenticatedUser } from "@/modules/authorization/service";
import { organizationSchema } from "@/modules/organizations/schemas";
import { createOrganization, listOrganizationsForUser } from "@/modules/organizations/service";

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    return apiSuccess(await listOrganizationsForUser(user.id));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireAuthenticatedUser();
    const input = organizationSchema.parse(await request.json());
    const organization = await createOrganization(user.id, input, getRequestIp(request));
    const response = apiSuccess(organization, { status: 201 });
    response.cookies.set(ACTIVE_ORGANIZATION_COOKIE, organization.id, {
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
