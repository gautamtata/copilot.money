import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

// Optimistic cookie check only — real session validation happens in the
// (app) layout and the /api/backend proxy.
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/transactions/:path*",
    "/cash-flow/:path*",
    "/accounts/:path*",
    "/investments/:path*",
    "/categories/:path*",
    "/recurrings/:path*",
    "/settings/:path*",
  ],
};
