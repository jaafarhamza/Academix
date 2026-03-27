import type { NextRequest, NextResponse } from "next/server";

const defaultCookieName = "academix_center_refresh_token";
const defaultCookiePath = "/api/center/refresh";
const defaultCookieMaxAgeSeconds = 7 * 24 * 60 * 60;
const defaultSessionCookieName = "academix_center_session";
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
  const configured = process.env.CENTER_BFF_COOKIE_SECURE?.trim();
  if (configured === "true") {
    return true;
  }
  if (configured === "false") {
    return false;
  }
  return process.env.NODE_ENV === "production";
}

export const centerRefreshCookieName =
  process.env.CENTER_BFF_COOKIE_NAME?.trim() || defaultCookieName;

export const centerRefreshCookiePath =
  process.env.CENTER_BFF_COOKIE_PATH?.trim() || defaultCookiePath;

export const centerRefreshCookieMaxAgeSeconds = Number.isFinite(
  Number(process.env.CENTER_BFF_COOKIE_MAX_AGE_SECONDS),
)
  ? Number(process.env.CENTER_BFF_COOKIE_MAX_AGE_SECONDS)
  : defaultCookieMaxAgeSeconds;

export const centerRefreshCookieSameSite = resolveSameSite(
  process.env.CENTER_BFF_COOKIE_SAME_SITE,
);

export const centerRefreshCookieDomain =
  process.env.CENTER_BFF_COOKIE_DOMAIN?.trim() || undefined;

export const centerRefreshCookieSecure = resolveCookieSecure();

export const centerSessionCookieName =
  process.env.CENTER_BFF_SESSION_COOKIE_NAME?.trim() || defaultSessionCookieName;

export const centerSessionCookiePath =
  process.env.CENTER_BFF_SESSION_COOKIE_PATH?.trim() || defaultSessionCookiePath;

export function readCenterRefreshCookie(request: NextRequest) {
  return request.cookies.get(centerRefreshCookieName)?.value ?? null;
}

export function setCenterRefreshCookie(response: NextResponse, refreshToken: string) {
  response.cookies.set({
    name: centerRefreshCookieName,
    value: refreshToken,
    httpOnly: true,
    secure: centerRefreshCookieSecure,
    sameSite: centerRefreshCookieSameSite,
    path: centerRefreshCookiePath,
    maxAge: centerRefreshCookieMaxAgeSeconds,
    domain: centerRefreshCookieDomain,
  });
}

export function clearCenterRefreshCookie(response: NextResponse) {
  response.cookies.set({
    name: centerRefreshCookieName,
    value: "",
    httpOnly: true,
    secure: centerRefreshCookieSecure,
    sameSite: centerRefreshCookieSameSite,
    path: centerRefreshCookiePath,
    maxAge: 0,
    domain: centerRefreshCookieDomain,
  });
}

export function setCenterSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: centerSessionCookieName,
    value: "1",
    httpOnly: true,
    secure: centerRefreshCookieSecure,
    sameSite: centerRefreshCookieSameSite,
    path: centerSessionCookiePath,
    maxAge: centerRefreshCookieMaxAgeSeconds,
    domain: centerRefreshCookieDomain,
  });
}

export function clearCenterSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: centerSessionCookieName,
    value: "",
    httpOnly: true,
    secure: centerRefreshCookieSecure,
    sameSite: centerRefreshCookieSameSite,
    path: centerSessionCookiePath,
    maxAge: 0,
    domain: centerRefreshCookieDomain,
  });
}

export function extractRefreshTokenFromSetCookieHeaders(setCookieHeaders: string[]) {
  const escapedCookieName = centerRefreshCookieName.replace(
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
