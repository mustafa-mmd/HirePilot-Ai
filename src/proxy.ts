import { NextResponse } from "next/server";

import { auth } from "@/auth";

const authProxy = auth((request) => {
  if (!request.auth) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
});

export { authProxy as proxy };

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding"],
};
