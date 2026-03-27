let centerAccessToken: string | null = null;

export function getCenterAccessToken() {
  return centerAccessToken;
}

export function setCenterAccessToken(token: string) {
  centerAccessToken = token;
}

export function clearCenterAccessToken() {
  centerAccessToken = null;
}
