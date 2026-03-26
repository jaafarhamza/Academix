let superAdminAccessToken: string | null = null;

export function getSuperAdminAccessToken() {
  return superAdminAccessToken;
}

export function setSuperAdminAccessToken(token: string) {
  superAdminAccessToken = token;
}

export function clearSuperAdminAccessToken() {
  superAdminAccessToken = null;
}
