let centerAccessToken: string | null = null;
const centerAccessTokenStorageKey = "academix.center.access_token";

function canUseBrowserStorage() {
  return typeof window !== "undefined";
}

export function getCenterAccessToken() {
  if (centerAccessToken) {
    return centerAccessToken;
  }

  if (!canUseBrowserStorage()) {
    return centerAccessToken;
  }

  try {
    const token = window.sessionStorage.getItem(centerAccessTokenStorageKey);
    if (token && token.trim().length > 0) {
      centerAccessToken = token;
    }
  } catch {
    // Storage access can fail in private mode or restricted environments.
  }

  return centerAccessToken;
}

export function setCenterAccessToken(token: string) {
  centerAccessToken = token;

  if (!canUseBrowserStorage()) {
    return;
  }

  try {
    window.sessionStorage.setItem(centerAccessTokenStorageKey, token);
  } catch {
    // Ignore storage errors and keep in-memory fallback.
  }
}

export function clearCenterAccessToken() {
  centerAccessToken = null;

  if (!canUseBrowserStorage()) {
    return;
  }

  try {
    window.sessionStorage.removeItem(centerAccessTokenStorageKey);
  } catch {
    // Ignore storage errors.
  }
}
