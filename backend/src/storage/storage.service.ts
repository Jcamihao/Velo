import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as MinioClient } from 'minio';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly publicBucket: string;
  private readonly privateBucket: string;
  private readonly publicUrl: string;
  private readonly privateFileUrlExpiresInSeconds: number;
  private readonly client: MinioClient;

  constructor(private readonly configService: ConfigService) {
    this.publicBucket = this.configService.get<string>(
      'storage.bucket',
      'velo-public',
    );
    this.privateBucket = this.configService.get<string>(
      'storage.privateBucket',
      'velo-private',
    );
    this.publicUrl = this.configService.get<string>(
      'storage.publicUrl',
      'http://localhost:9000/velo-public',
    );
    this.privateFileUrlExpiresInSeconds = this.configService.get<number>(
      'storage.privateFileUrlExpiresInSeconds',
      600,
    );
    this.client = new MinioClient({
      endPoint: this.configService.get<string>('storage.endpoint', 'localhost'),
      port: this.configService.get<number>('storage.port', 9000),
      useSSL: this.configService.get<boolean>('storage.useSSL', false),
      accessKey: this.configService.get<string>(
        'storage.accessKey',
        'minioadmin',
      ),
      secretKey: this.configService.get<string>(
        'storage.secretKey',
        'minioadmin',
      ),
    });
  }

  async ensureBucketExists() {
    try {
      await this.ensureBucket(this.publicBucket);
      await this.ensureBucket(this.privateBucket);
      await this.ensureBucketIsPublic(this.publicBucket);
    } catch (error) {
      this.logger.warn(
        'Não foi possível validar/criar os buckets do MinIO. Uploads podem falhar até o serviço ficar disponível.',
      );
    }
  }

  async uploadPublicFile(
    file: Express.Multer.File,
    folder: 'vehicles' | 'users' | 'documents',
  ) {
    const extension = extname(file.originalname || '');
    const objectKey = `${folder}/${uuidv4()}${extension}`;

    await this.putObject(this.publicBucket, objectKey, file);

    return {
      key: objectKey,
      url: `${this.publicUrl}/${objectKey}`,
    };
  }

  async uploadPrivateFile(
    file: Express.Multer.File,
    folder: 'documents',
  ) {
    const extension = extname(file.originalname || '');
    const objectKey = `${folder}/${uuidv4()}${extension}`;

    await this.putObject(this.privateBucket, objectKey, file);

    return {
      key: objectKey,
    };
  }

  async deletePublicFileByUrl(url: string | null | undefined) {
    const objectKey = this.extractObjectKeyFromPublicUrl(url);

    if (!objectKey) {
      return;
    }

    await this.deleteObjectFromBucket(this.publicBucket, objectKey);
  }

  async deleteObject(objectKey: string) {
    await this.deleteObjectFromBucket(this.publicBucket, objectKey);
  }

  async deletePrivateFileByStoredValue(value: string | null | undefined) {
    if (!value) {
      return;
    }

    const legacyPublicObjectKey = this.extractObjectKeyFromPublicUrl(value);

    if (legacyPublicObjectKey) {
      await this.deleteObjectFromBucket(this.publicBucket, legacyPublicObjectKey);
      return;
    }

    await this.deleteObjectFromBucket(this.privateBucket, value).catch((error) => {
      this.logger.warn(
        `Nao foi possivel remover o arquivo privado ${value}: ${
          error instanceof Error ? error.message : 'Erro desconhecido'
        }`,
      );
    });
  }

  async getPrivateFileUrl(value: string | null | undefined) {
    if (!value) {
      return null;
    }

    const legacyPublicUrl = this.normalizeLegacyPublicUrl(value);

    if (legacyPublicUrl) {
      return legacyPublicUrl;
    }

    return this.client.presignedGetObject(
      this.privateBucket,
      value,
      this.privateFileUrlExpiresInSeconds,
    );
  }

  private async ensureBucket(bucket: string) {
    const exists = await this.client.bucketExists(bucket);

    if (!exists) {
      await this.client.makeBucket(bucket);
    }
  }

  private async ensureBucketIsPublic(bucket: string) {
    const publicReadPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: {
            AWS: ['*'],
          },
          Action: ['s3:GetBucketLocation'],
          Resource: [`arn:aws:s3:::${bucket}`],
        },
        {
          Effect: 'Allow',
          Principal: {
            AWS: ['*'],
          },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${bucket}/*`],
        },
      ],
    };

    await this.client.setBucketPolicy(
      bucket,
      JSON.stringify(publicReadPolicy),
    );
  }

  private async putObject(
    bucket: string,
    objectKey: string,
    file: Express.Multer.File,
  ) {
    await this.client.putObject(bucket, objectKey, file.buffer, file.size, {
      'Content-Type': file.mimetype,
    });
  }

  private async deleteObjectFromBucket(bucket: string, objectKey: string) {
    await this.client.removeObject(bucket, objectKey);
  }

  private extractObjectKeyFromPublicUrl(url: string | null | undefined) {
    if (!url) {
      return null;
    }

    const normalizedPublicUrl = this.publicUrl.replace(/\/+$/, '');

    if (url.startsWith(`${normalizedPublicUrl}/`)) {
      return url.slice(normalizedPublicUrl.length + 1);
    }

    try {
      const parsedUrl = new URL(url);
      const parsedPublicUrl = new URL(normalizedPublicUrl);

      if (parsedUrl.origin !== parsedPublicUrl.origin) {
        return null;
      }

      const publicPath = parsedPublicUrl.pathname.replace(/\/+$/, '');

      if (!parsedUrl.pathname.startsWith(`${publicPath}/`)) {
        return null;
      }

      return decodeURIComponent(parsedUrl.pathname.slice(publicPath.length + 1));
    } catch (error) {
      this.logger.warn(
        `Nao foi possivel extrair a chave do arquivo publico: ${url}`,
      );
      return null;
    }
  }

  private normalizeLegacyPublicUrl(value: string) {
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return value;
    }

    return null;
  }
}
