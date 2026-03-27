import { registerAs } from '@nestjs/config';

export const storageConfig = registerAs('storage', () => ({
  endpoint: process.env.MINIO_ENDPOINT ?? 'localhost',
  port: parseInt(process.env.MINIO_PORT ?? '9000', 10),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
  bucket: process.env.MINIO_BUCKET ?? 'velo-public',
  privateBucket: process.env.MINIO_PRIVATE_BUCKET ?? 'velo-private',
  privateFileUrlExpiresInSeconds: parseInt(
    process.env.MINIO_PRIVATE_URL_EXPIRES_IN_SECONDS ?? '600',
    10,
  ),
  publicUrl:
    process.env.MINIO_PUBLIC_URL ?? 'http://localhost:9000/velo-public',
}));
