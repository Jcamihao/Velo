import { registerAs } from '@nestjs/config';

export const authConfig = registerAs('auth', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? 'velo_access_secret',
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'velo_refresh_secret',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  refreshCookieName: process.env.JWT_REFRESH_COOKIE_NAME ?? 'velo_refresh_token',
  refreshCookieSecure: process.env.JWT_REFRESH_COOKIE_SECURE === 'true',
  refreshCookieSameSite:
    process.env.JWT_REFRESH_COOKIE_SAME_SITE ?? 'lax',
}));
