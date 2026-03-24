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

export default () => ({
  app: {
    port: Number(process.env.PORT ?? 3000),
    nodeEnv: process.env.NODE_ENV ?? 'development',
  },
  database: {
    url: process.env.DATABASE_URL ?? '',
  },
  superAdminAuth: {
    jwtSecret:
      process.env.SUPER_ADMIN_JWT_SECRET ??
      'development-super-admin-jwt-secret-change-me',
    jwtExpiresIn: process.env.SUPER_ADMIN_JWT_EXPIRES_IN ?? '1h',
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
  },
  cors: {
    origin: parseCorsOrigin(process.env.CORS_ORIGIN),
    credentials: parseBoolean(process.env.CORS_CREDENTIALS, true),
    methods: parseCsv(process.env.CORS_METHODS),
    allowedHeaders: parseCsv(process.env.CORS_ALLOWED_HEADERS),
    exposedHeaders: parseCsv(process.env.CORS_EXPOSED_HEADERS),
  },
});
