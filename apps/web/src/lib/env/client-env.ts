const fallbackApiBaseUrl = "http://localhost:3001/api/v1";
const fallbackAuthRefreshPath = "auth/refresh";

function normalizeRefreshPath(path: string) {
  const trimmed = path.trim();

  if (!trimmed) {
    return fallbackAuthRefreshPath;
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
  authRefreshPath: normalizeRefreshPath(
    process.env.NEXT_PUBLIC_AUTH_REFRESH_PATH ?? fallbackAuthRefreshPath,
  ),
} as const;
