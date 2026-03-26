import { NextRequest, NextResponse } from "next/server";

const sessionCookieName =
  process.env.SUPER_ADMIN_BFF_SESSION_COOKIE_NAME?.trim() ||
  "academix_super_admin_session";

const superAdminLoginPath = "/super-admin/login";
const superAdminHomePath = "/super-admin";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hasSessionCookie = request.cookies.has(sessionCookieName);

  if (pathname.startsWith(`${superAdminHomePath}/`) || pathname === superAdminHomePath) {
    if (!pathname.startsWith(superAdminLoginPath) && !hasSessionCookie) {
      return NextResponse.redirect(new URL(superAdminLoginPath, request.url));
    }
  }

  if (pathname === superAdminLoginPath && hasSessionCookie) {
    return NextResponse.redirect(new URL(superAdminHomePath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/super-admin/:path*"],
};
