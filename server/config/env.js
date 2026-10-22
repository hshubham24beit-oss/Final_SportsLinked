const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { z } = require('zod');

const isTest = process.env.NODE_ENV === 'test';
const isProduction = process.env.NODE_ENV === 'production';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  CLIENT_URL: z.string().url('CLIENT_URL must be a valid URL'),
  CORS_ORIGINS: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  COOKIE_NAME: z.string().min(1).default('sportlinked_refresh'),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  COOKIE_SECURE: z.enum(['true', 'false']).optional(),
  COOKIE_DOMAIN: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.enum(['true', 'false']).default('false'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('SportLinked <no-reply@sportlinked.app>'),
  API_PUBLIC_URL: z.string().url('API_PUBLIC_URL must be a valid URL').optional(),
  UPLOAD_DIR: z.string().optional(),
  PRIVATE_UPLOAD_DIR: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_UPLOAD_FOLDER: z.string().default('sportlinked/profiles'),
  ADMIN_NAME: z.string().optional(),
  ADMIN_EMAIL: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  DEADLINE_REMINDER_HOURS: z.coerce.number().positive().max(168).default(24),
  AI_PROVIDER: z.enum(['disabled', 'openai-compatible']).default('disabled'),
  AI_API_KEY: z.string().optional(),
  AI_BASE_URL: z.string().url('AI_BASE_URL must be a valid URL').default('https://api.openai.com/v1'),
  AI_MODEL: z.string().min(1).default('gpt-4o-mini'),
  AI_TIMEOUT_MS: z.coerce.number().int().min(500).max(60000).default(8000),
  AI_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(1000).default(20),
  AI_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).max(86400000).default(900000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => ` - ${issue.path.join('.')}: ${issue.message}`);
  console.error(`Invalid or missing environment configuration:\n${details.join('\n')}`);
  console.error('Copy server/.env.example to server/.env and fill in the required values.');
  throw new Error('Invalid server environment configuration');
}

const env = parsed.data;

const corsOrigins = (env.CORS_ORIGINS || env.CLIENT_URL)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const config = {
  env: env.NODE_ENV,
  isTest,
  isProduction,
  port: env.PORT,
  mongodbUri: env.MONGODB_URI,
  clientUrl: env.CLIENT_URL.replace(/\/$/, ''),
  corsOrigins,
  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },
  cookie: {
    name: env.COOKIE_NAME,
    sameSite: env.COOKIE_SAME_SITE,
    secure: env.COOKIE_SECURE ? env.COOKIE_SECURE === 'true' : isProduction,
    domain: env.COOKIE_DOMAIN || undefined,
    path: '/api/v1/auth',
  },
  mail: {
    host: env.SMTP_HOST || '',
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE === 'true',
    user: env.SMTP_USER || '',
    pass: env.SMTP_PASS || '',
    from: env.MAIL_FROM,
  },
  bcryptRounds: isTest ? 10 : 12,
  publicApiUrl: (env.API_PUBLIC_URL || `http://localhost:${env.PORT}`).replace(/\/$/, ''),
  uploadsDir: env.UPLOAD_DIR
    ? path.resolve(env.UPLOAD_DIR)
    : path.resolve(__dirname, '..', 'uploads'),
  privateUploadsDir: env.PRIVATE_UPLOAD_DIR
    ? path.resolve(env.PRIVATE_UPLOAD_DIR)
    : path.resolve(__dirname, '..', 'private-uploads'),
  cloudinary: {
    cloudName: env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: env.CLOUDINARY_API_KEY || '',
    apiSecret: env.CLOUDINARY_API_SECRET || '',
    folder: env.CLOUDINARY_UPLOAD_FOLDER.replace(/^\/+|\/+$/g, ''),
    configured: Boolean(
      env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
    ),
  },
  admin: {
    name: env.ADMIN_NAME,
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
  },
  deadlineReminderHours: env.DEADLINE_REMINDER_HOURS,
  ai: {
    provider: env.AI_PROVIDER,
    apiKey: env.AI_API_KEY || '',
    baseUrl: env.AI_BASE_URL.replace(/\/$/, ''),
    model: env.AI_MODEL,
    timeoutMs: env.AI_TIMEOUT_MS,
    rateLimitMax: env.AI_RATE_LIMIT_MAX,
    rateLimitWindowMs: env.AI_RATE_LIMIT_WINDOW_MS,
  },
};

module.exports = config;
