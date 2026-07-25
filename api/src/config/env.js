import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    MONGODB_URI: z.string().trim().min(1).default('mongodb://localhost:27017/tee3_backend'),
    JWT_PRIVATE_KEY_BASE64: z.string().trim().min(1).default('base64_encoded_private_key_here'),
    JWT_PUBLIC_KEY_BASE64: z.string().trim().min(1).default('base64_encoded_public_key_here'),
    ACCESS_TOKEN_EXPIRES_IN: z.string().trim().min(1).default('15m'),
    REFRESH_TOKEN_EXPIRES_IN: z.string().trim().min(1).default('2d'),
    REFRESH_COOKIE_NAME: z.string().trim().min(1).default('refreshToken'),
    REFRESH_COOKIE_MAX_AGE_MS: z.coerce.number().int().min(1000).default(2 * 24 * 60 * 60 * 1000),
    COOKIE_SECURE: z.coerce.boolean().default(false),
    COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('lax'),
    COOKIE_DOMAIN: z.string().trim().optional(),
    CORS_ORIGIN: z.string().trim().min(1).default('*'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(15 * 60 * 1000),
    RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(300),
    REDIS_URL: z.string().trim().min(1).default('redis://localhost:6379'),
    SUPER_ADMIN_NAME: z.string().trim().min(2).default('Super Admin'),
    SUPER_ADMIN_EMAIL: z.string().trim().email().optional(),
    SUPER_ADMIN_PASSWORD: z.string().min(8).optional(),
    IMAGEKIT_PUBLIC_KEY: z.string().trim().optional(),
    IMAGEKIT_PRIVATE_KEY: z.string().trim().optional(),
    IMAGEKIT_URL_ENDPOINT: z.string().trim().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && env.JWT_PRIVATE_KEY_BASE64 === 'base64_encoded_private_key_here') {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_PRIVATE_KEY_BASE64'],
        message: 'JWT_PRIVATE_KEY_BASE64 must be configured in production',
      });
    }

    if (env.NODE_ENV === 'production' && env.JWT_PUBLIC_KEY_BASE64 === 'base64_encoded_public_key_here') {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_PUBLIC_KEY_BASE64'],
        message: 'JWT_PUBLIC_KEY_BASE64 must be configured in production',
      });
    }

    if (env.NODE_ENV === 'production' && env.CORS_ORIGIN === '*') {
      ctx.addIssue({
        code: 'custom',
        path: ['CORS_ORIGIN'],
        message: 'CORS_ORIGIN must be restricted in production',
      });
    }

    if (env.COOKIE_SAME_SITE === 'none' && !env.COOKIE_SECURE) {
      ctx.addIssue({
        code: 'custom',
        path: ['COOKIE_SECURE'],
        message: 'COOKIE_SECURE must be true when COOKIE_SAME_SITE is none',
      });
    }
  });

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const details = result.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');

  throw new Error(`Invalid environment configuration: ${details}`);
}

const env = Object.freeze(result.data);

export default env;
