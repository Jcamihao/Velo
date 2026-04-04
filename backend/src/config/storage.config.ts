import { registerAs } from '@nestjs/config';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

function isLocalHost(hostname: string) {
  return LOCAL_HOSTS.has(hostname.toLowerCase());
}

function resolvePublicStorageUrl() {
  const fallbackPublicUrl =
    process.env.MINIO_PUBLIC_URL ?? 'http://localhost:9000/triluga-public';
  const frontendApiBaseUrl = process.env.FRONTEND_APP_API_BASE_URL;

  if (!frontendApiBaseUrl) {
    return fallbackPublicUrl;
  }

  try {
    const publicUrl = new URL(fallbackPublicUrl);
    const apiBaseUrl = new URL(frontendApiBaseUrl);

    if (!isLocalHost(publicUrl.hostname) || isLocalHost(apiBaseUrl.hostname)) {
      return fallbackPublicUrl;
    }

    publicUrl.hostname = apiBaseUrl.hostname;
    return publicUrl.toString();
  } catch {
    return fallbackPublicUrl;
  }
}

export const storageConfig = registerAs('storage', () => ({
  endpoint: process.env.MINIO_ENDPOINT ?? 'localhost',
  port: parseInt(process.env.MINIO_PORT ?? '9000', 10),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
  bucket: process.env.MINIO_BUCKET ?? 'triluga-public',
  privateBucket: process.env.MINIO_PRIVATE_BUCKET ?? 'triluga-private',
  privateFileUrlExpiresInSeconds: parseInt(
    process.env.MINIO_PRIVATE_URL_EXPIRES_IN_SECONDS ?? '600',
    10,
  ),
  publicUrl: resolvePublicStorageUrl(),
}));
