const fallbackApiBaseUrl = "http://localhost:3001/api/v1";
const fallbackAuthLoginPath = "auth/login";
const fallbackAuthLogoutPath = "auth/logout";
const fallbackAuthRefreshPath = "auth/refresh";

function normalizeApiPath(path: string, fallbackPath: string) {
  const trimmed = path.trim();

  if (!trimmed) {
    return fallbackPath;
  }

  return trimmed.replace(/^\/+/, "");
}

function getApiBaseUrl() {
  const value = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (value) {
    return value;
  }

  return fallbackApiBaseUrl;
}

export const clientEnv = {
  apiBaseUrl: getApiBaseUrl(),
  authLoginPath: normalizeApiPath(
    process.env.NEXT_PUBLIC_AUTH_LOGIN_PATH ?? fallbackAuthLoginPath,
    fallbackAuthLoginPath,
  ),
  authLogoutPath: normalizeApiPath(
    process.env.NEXT_PUBLIC_AUTH_LOGOUT_PATH ?? fallbackAuthLogoutPath,
    fallbackAuthLogoutPath,
  ),
  authRefreshPath: normalizeApiPath(
    process.env.NEXT_PUBLIC_AUTH_REFRESH_PATH ?? fallbackAuthRefreshPath,
    fallbackAuthRefreshPath,
  ),
} as const;
