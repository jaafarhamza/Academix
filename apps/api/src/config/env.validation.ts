import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().integer().min(1).max(65535).default(3000),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgres', 'postgresql'] })
    .required(),
  SUPER_ADMIN_JWT_SECRET: Joi.string()
    .min(32)
    .default('development-super-admin-jwt-secret-change-me'),
  SUPER_ADMIN_JWT_EXPIRES_IN: Joi.string().default('1h'),
  SUPER_ADMIN_BOOTSTRAP_ENABLED: Joi.boolean().truthy('true').falsy('false'),
  SUPER_ADMIN_BOOTSTRAP_EMAIL: Joi.string()
    .email()
    .default('superadmin@academix.com'),
  SUPER_ADMIN_BOOTSTRAP_PASSWORD: Joi.string()
    .min(12)
    .default('Academix.SuperAdmin.2026'),
  SUPER_ADMIN_BOOTSTRAP_FIRST_NAME: Joi.string().min(1).default('Super'),
  SUPER_ADMIN_BOOTSTRAP_LAST_NAME: Joi.string().min(1).default('Admin'),
  SUPER_ADMIN_BOOTSTRAP_PHONE: Joi.string()
    .min(6)
    .max(32)
    .default('+212600000001'),
  CENTER_JWT_SECRET: Joi.string()
    .min(32)
    .default('development-center-jwt-secret-change-me'),
  CENTER_JWT_EXPIRES_IN: Joi.string().default('1h'),
  USER_JWT_SECRET: Joi.string()
    .min(32)
    .default('development-user-jwt-secret-change-me'),
  USER_JWT_EXPIRES_IN: Joi.string().default('1h'),
  USER_REFRESH_JWT_SECRET: Joi.string()
    .min(32)
    .default('development-user-refresh-jwt-secret-change-me'),
  USER_REFRESH_JWT_EXPIRES_IN: Joi.string().default('7d'),
  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),
  CORS_CREDENTIALS: Joi.boolean().truthy('true').falsy('false').default(true),
  CORS_METHODS: Joi.string().default('GET,HEAD,PUT,PATCH,POST,DELETE'),
  CORS_ALLOWED_HEADERS: Joi.string().default('Content-Type,Authorization'),
  CORS_EXPOSED_HEADERS: Joi.string().allow('').default(''),
});
