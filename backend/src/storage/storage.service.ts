import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as MinioClient } from 'minio';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly bucket: string;
  private readonly publicUrl: string;
  private readonly client: MinioClient;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('storage.bucket', 'carbnb');
    this.publicUrl = this.configService.get<string>(
      'storage.publicUrl',
      'http://localhost:9000/carbnb',
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
      const exists = await this.client.bucketExists(this.bucket);

      if (!exists) {
        await this.client.makeBucket(this.bucket);
      }

      await this.ensureBucketIsPublic();
    } catch (error) {
      this.logger.warn(
        'Não foi possível validar/criar o bucket do MinIO. Uploads podem falhar até o serviço ficar disponível.',
      );
    }
  }

  async uploadPublicFile(
    file: Express.Multer.File,
    folder: 'vehicles' | 'users' | 'documents',
  ) {
    const extension = extname(file.originalname || '');
    const objectKey = `${folder}/${uuidv4()}${extension}`;

    await this.client.putObject(
      this.bucket,
      objectKey,
      file.buffer,
      file.size,
      {
        'Content-Type': file.mimetype,
      },
    );

    return {
      key: objectKey,
      url: `${this.publicUrl}/${objectKey}`,
    };
  }

  async deleteObject(objectKey: string) {
    await this.client.removeObject(this.bucket, objectKey);
  }

  async deletePublicFileByUrl(url: string | null | undefined) {
    const objectKey = this.extractObjectKeyFromPublicUrl(url);

    if (!objectKey) {
      return;
    }

    await this.deleteObject(objectKey);
  }

  private async ensureBucketIsPublic() {
    const publicReadPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: {
            AWS: ['*'],
          },
          Action: ['s3:GetBucketLocation'],
          Resource: [`arn:aws:s3:::${this.bucket}`],
        },
        {
          Effect: 'Allow',
          Principal: {
            AWS: ['*'],
          },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${this.bucket}/*`],
        },
      ],
    };

    await this.client.setBucketPolicy(
      this.bucket,
      JSON.stringify(publicReadPolicy),
    );
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
}
