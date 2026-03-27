import { NextRequest, NextResponse } from "next/server";

const superAdminSessionCookieName =
  process.env.SUPER_ADMIN_BFF_SESSION_COOKIE_NAME?.trim() ||
  "academix_super_admin_session";
const centerSessionCookieName =
  process.env.CENTER_BFF_SESSION_COOKIE_NAME?.trim() || "academix_center_session";

const superAdminLoginPath = "/super-admin/login";
const superAdminHomePath = "/super-admin";
const centerLoginPath = "/center/login";
const centerRegisterPath = "/center/register";
const centerHomePath = "/center";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hasSuperAdminSessionCookie = request.cookies.has(superAdminSessionCookieName);
  const hasCenterSessionCookie = request.cookies.has(centerSessionCookieName);

  if (pathname.startsWith(`${superAdminHomePath}/`) || pathname === superAdminHomePath) {
    if (!pathname.startsWith(superAdminLoginPath) && !hasSuperAdminSessionCookie) {
      return NextResponse.redirect(new URL(superAdminLoginPath, request.url));
    }
  }

  if (pathname === superAdminLoginPath && hasSuperAdminSessionCookie) {
    return NextResponse.redirect(new URL(superAdminHomePath, request.url));
  }

  if (pathname.startsWith(`${centerHomePath}/`) || pathname === centerHomePath) {
    const isCenterPublicPath =
      pathname === centerLoginPath || pathname === centerRegisterPath;

    if (!isCenterPublicPath && !hasCenterSessionCookie) {
      return NextResponse.redirect(new URL(centerLoginPath, request.url));
    }
  }

  if (
    (pathname === centerLoginPath || pathname === centerRegisterPath) &&
    hasCenterSessionCookie
  ) {
    return NextResponse.redirect(new URL(centerHomePath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/super-admin/:path*", "/center/:path*"],
};
