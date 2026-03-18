const accessTokenKey = "academix.access_token";

export function getAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(accessTokenKey);
}

export function setAccessToken(token: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(accessTokenKey, token);
}

export function clearAccessToken() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(accessTokenKey);
}
