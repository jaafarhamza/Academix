import type { NextRequest, NextResponse } from "next/server";

const defaultCookieName = "academix_super_admin_refresh_token";
const defaultCookiePath = "/api/super-admin/refresh";
const defaultCookieMaxAgeSeconds = 7 * 24 * 60 * 60;
const defaultSessionCookieName = "academix_super_admin_session";
const defaultSessionCookiePath = "/";

const sameSiteValues = ["lax", "strict", "none"] as const;
type CookieSameSite = (typeof sameSiteValues)[number];

function resolveSameSite(value: string | undefined): CookieSameSite {
  if (!value) {
    return "lax";
  }

  const normalized = value.trim().toLowerCase();
  if (sameSiteValues.includes(normalized as CookieSameSite)) {
    return normalized as CookieSameSite;
  }

  return "lax";
}

function resolveCookieSecure() {
  const configured = process.env.SUPER_ADMIN_BFF_COOKIE_SECURE?.trim();
  if (configured === "true") {
    return true;
  }
  if (configured === "false") {
    return false;
  }
  return process.env.NODE_ENV === "production";
}

export const superAdminRefreshCookieName =
  process.env.SUPER_ADMIN_BFF_COOKIE_NAME?.trim() || defaultCookieName;

export const superAdminRefreshCookiePath =
  process.env.SUPER_ADMIN_BFF_COOKIE_PATH?.trim() || defaultCookiePath;

export const superAdminRefreshCookieMaxAgeSeconds = Number.isFinite(
  Number(process.env.SUPER_ADMIN_BFF_COOKIE_MAX_AGE_SECONDS),
)
  ? Number(process.env.SUPER_ADMIN_BFF_COOKIE_MAX_AGE_SECONDS)
  : defaultCookieMaxAgeSeconds;

export const superAdminRefreshCookieSameSite = resolveSameSite(
  process.env.SUPER_ADMIN_BFF_COOKIE_SAME_SITE,
);

export const superAdminRefreshCookieDomain =
  process.env.SUPER_ADMIN_BFF_COOKIE_DOMAIN?.trim() || undefined;

export const superAdminRefreshCookieSecure = resolveCookieSecure();

export const superAdminSessionCookieName =
  process.env.SUPER_ADMIN_BFF_SESSION_COOKIE_NAME?.trim() ||
  defaultSessionCookieName;

export const superAdminSessionCookiePath =
  process.env.SUPER_ADMIN_BFF_SESSION_COOKIE_PATH?.trim() ||
  defaultSessionCookiePath;

export function readSuperAdminRefreshCookie(request: NextRequest) {
  return request.cookies.get(superAdminRefreshCookieName)?.value ?? null;
}

export function setSuperAdminRefreshCookie(
  response: NextResponse,
  refreshToken: string,
) {
  response.cookies.set({
    name: superAdminRefreshCookieName,
    value: refreshToken,
    httpOnly: true,
    secure: superAdminRefreshCookieSecure,
    sameSite: superAdminRefreshCookieSameSite,
    path: superAdminRefreshCookiePath,
    maxAge: superAdminRefreshCookieMaxAgeSeconds,
    domain: superAdminRefreshCookieDomain,
  });
}

export function clearSuperAdminRefreshCookie(response: NextResponse) {
  response.cookies.set({
    name: superAdminRefreshCookieName,
    value: "",
    httpOnly: true,
    secure: superAdminRefreshCookieSecure,
    sameSite: superAdminRefreshCookieSameSite,
    path: superAdminRefreshCookiePath,
    maxAge: 0,
    domain: superAdminRefreshCookieDomain,
  });
}

export function setSuperAdminSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: superAdminSessionCookieName,
    value: "1",
    httpOnly: true,
    secure: superAdminRefreshCookieSecure,
    sameSite: superAdminRefreshCookieSameSite,
    path: superAdminSessionCookiePath,
    maxAge: superAdminRefreshCookieMaxAgeSeconds,
    domain: superAdminRefreshCookieDomain,
  });
}

export function clearSuperAdminSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: superAdminSessionCookieName,
    value: "",
    httpOnly: true,
    secure: superAdminRefreshCookieSecure,
    sameSite: superAdminRefreshCookieSameSite,
    path: superAdminSessionCookiePath,
    maxAge: 0,
    domain: superAdminRefreshCookieDomain,
  });
}

export function extractRefreshTokenFromSetCookieHeaders(
  setCookieHeaders: string[],
) {
  const escapedCookieName = superAdminRefreshCookieName.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
  const cookiePrefix = new RegExp(`^${escapedCookieName}=([^;]+)`, "i");

  for (const header of setCookieHeaders) {
    const match = header.match(cookiePrefix);
    if (!match?.[1]) {
      continue;
    }

    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }

  return null;
}
