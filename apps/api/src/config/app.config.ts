const parseCsv = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const parseBoolean = (
  value: string | undefined,
  fallback: boolean,
): boolean => {
  if (value === undefined) {
    return fallback;
  }
  return value.toLowerCase() === 'true';
};

const parseCorsOrigin = (value: string | undefined): string | string[] => {
  const origins = parseCsv(value);
  if (origins.length <= 1) {
    return origins[0] ?? 'http://localhost:3000';
  }
  return origins;
};

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseTrustProxy = (
  value: string | undefined,
): boolean | string | number => {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  const parsedNumber = Number(value);
  if (Number.isInteger(parsedNumber) && parsedNumber >= 0) {
    return parsedNumber;
  }

  return value;
};

const parseSameSite = (
  value: string | undefined,
): 'strict' | 'lax' | 'none' => {
  if (!value) {
    return 'lax';
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'strict' || normalized === 'none') {
    return normalized;
  }

  return 'lax';
};

export default () => ({
  app: {
    port: Number(process.env.PORT ?? 3000),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    trustProxy: parseTrustProxy(process.env.APP_TRUST_PROXY),
  },
  database: {
    url: process.env.DATABASE_URL ?? '',
  },
  superAdminAuth: {
    jwtSecret:
      process.env.SUPER_ADMIN_JWT_SECRET ??
      'development-super-admin-jwt-secret-change-me',
    jwtExpiresIn: process.env.SUPER_ADMIN_JWT_EXPIRES_IN ?? '1h',
    refreshJwtSecret:
      process.env.SUPER_ADMIN_REFRESH_JWT_SECRET ??
      'development-super-admin-refresh-jwt-secret-change-me',
    refreshJwtExpiresIn: process.env.SUPER_ADMIN_REFRESH_JWT_EXPIRES_IN ?? '7d',
    refreshCookieName:
      process.env.SUPER_ADMIN_REFRESH_COOKIE_NAME ??
      'academix_super_admin_refresh_token',
    refreshCookiePath:
      process.env.SUPER_ADMIN_REFRESH_COOKIE_PATH ?? '/super-admin/refresh',
    refreshCookieDomain: process.env.SUPER_ADMIN_REFRESH_COOKIE_DOMAIN ?? '',
    refreshCookieSecure: parseBoolean(
      process.env.SUPER_ADMIN_REFRESH_COOKIE_SECURE,
      (process.env.NODE_ENV ?? 'development') === 'production',
    ),
    refreshCookieSameSite: parseSameSite(
      process.env.SUPER_ADMIN_REFRESH_COOKIE_SAME_SITE,
    ),
    refreshCookieMaxAgeMs: parseNumber(
      process.env.SUPER_ADMIN_REFRESH_COOKIE_MAX_AGE_MS,
      7 * 24 * 60 * 60 * 1000,
    ),
  },
  superAdminBootstrap: {
    enabled: parseBoolean(
      process.env.SUPER_ADMIN_BOOTSTRAP_ENABLED,
      (process.env.NODE_ENV ?? 'development') === 'development',
    ),
    email: process.env.SUPER_ADMIN_BOOTSTRAP_EMAIL ?? 'superadmin@academix.com',
    password:
      process.env.SUPER_ADMIN_BOOTSTRAP_PASSWORD ??
      process.env.SEED_SUPER_ADMIN_PASSWORD ??
      'Academix.SuperAdmin.2026',
    firstName: process.env.SUPER_ADMIN_BOOTSTRAP_FIRST_NAME ?? 'Super',
    lastName: process.env.SUPER_ADMIN_BOOTSTRAP_LAST_NAME ?? 'Admin',
    phone: process.env.SUPER_ADMIN_BOOTSTRAP_PHONE ?? '+212600000001',
  },
  centerAuth: {
    jwtSecret:
      process.env.CENTER_JWT_SECRET ??
      'development-center-jwt-secret-change-me',
    jwtExpiresIn: process.env.CENTER_JWT_EXPIRES_IN ?? '1h',
  },
  userAuth: {
    jwtSecret:
      process.env.USER_JWT_SECRET ?? 'development-user-jwt-secret-change-me',
    jwtExpiresIn: process.env.USER_JWT_EXPIRES_IN ?? '1h',
    refreshJwtSecret:
      process.env.USER_REFRESH_JWT_SECRET ??
      'development-user-refresh-jwt-secret-change-me',
    refreshJwtExpiresIn: process.env.USER_REFRESH_JWT_EXPIRES_IN ?? '7d',
    refreshCookieName:
      process.env.USER_REFRESH_COOKIE_NAME ?? 'academix_refresh_token',
    refreshCookiePath: process.env.USER_REFRESH_COOKIE_PATH ?? '/auth/refresh',
    refreshCookieDomain: process.env.USER_REFRESH_COOKIE_DOMAIN ?? '',
    refreshCookieSecure: parseBoolean(
      process.env.USER_REFRESH_COOKIE_SECURE,
      (process.env.NODE_ENV ?? 'development') === 'production',
    ),
    refreshCookieSameSite: parseSameSite(
      process.env.USER_REFRESH_COOKIE_SAME_SITE,
    ),
    refreshCookieMaxAgeMs: parseNumber(
      process.env.USER_REFRESH_COOKIE_MAX_AGE_MS,
      7 * 24 * 60 * 60 * 1000,
    ),
  },
  throttling: {
    defaultTtlMs: parseNumber(process.env.THROTTLE_DEFAULT_TTL_MS, 60_000),
    defaultLimit: parseNumber(process.env.THROTTLE_DEFAULT_LIMIT, 120),
    authTtlMs: parseNumber(process.env.THROTTLE_AUTH_TTL_MS, 60_000),
    authLimit: parseNumber(process.env.THROTTLE_AUTH_LIMIT, 5),
  },
  cors: {
    origin: parseCorsOrigin(process.env.CORS_ORIGIN),
    credentials: parseBoolean(process.env.CORS_CREDENTIALS, true),
    methods: parseCsv(process.env.CORS_METHODS),
    allowedHeaders: parseCsv(process.env.CORS_ALLOWED_HEADERS),
    exposedHeaders: parseCsv(process.env.CORS_EXPOSED_HEADERS),
  },
});
