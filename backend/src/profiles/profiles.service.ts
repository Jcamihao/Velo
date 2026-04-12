import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UserStatus, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async getMyProfile(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    return this.mapPrivateProfile(profile);
  }

  async getPublicProfile(userId: string) {
    const [user, reviewsAggregate, reviews, vehicles] = await Promise.all([
      this.prisma.user.findFirst({
        where: {
          id: userId,
          status: {
            not: UserStatus.BLOCKED,
          },
        },
        include: {
          profile: true,
        },
      }),
      this.prisma.userReview.aggregate({
        where: {
          targetUserId: userId,
        },
        _avg: {
          rating: true,
        },
        _count: {
          rating: true,
        },
      }),
      this.prisma.userReview.findMany({
        where: {
          targetUserId: userId,
        },
        include: {
          author: {
            include: {
              profile: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 12,
      }),
      this.prisma.vehicle.findMany({
        where: {
          ownerId: userId,
          isActive: true,
          isPublished: true,
        },
        include: {
          images: {
            orderBy: {
              position: 'asc',
            },
            take: 1,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    const documentStatus =
      user.profile?.documentVerificationStatus ??
      VerificationStatus.NOT_SUBMITTED;
    const driverLicenseStatus =
      user.profile?.driverLicenseVerification ??
      VerificationStatus.NOT_SUBMITTED;
    const ratingAverage = Number((reviewsAggregate._avg.rating ?? 0).toFixed(1));

    return {
      id: user.id,
      role: user.role,
      memberSince: user.createdAt,
      fullName:
        user.profile?.fullName?.trim() || user.email.split('@')[0] || 'Usuário',
      avatarUrl: user.profile?.avatarUrl ?? null,
      bio: user.profile?.bio ?? null,
      city: user.profile?.city ?? null,
      state: user.profile?.state ?? null,
      ratingAverage,
      reviewsCount: reviewsAggregate._count.rating,
      activeListingsCount: vehicles.length,
      trustMetrics: {
        activeListingsCount: vehicles.length,
        reviewsCount: reviewsAggregate._count.rating,
        averageRating: ratingAverage,
      },
      reviews: reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment ?? null,
        createdAt: review.createdAt,
        author: {
          id: review.author.id,
          fullName: review.author.profile?.fullName?.trim() || 'Usuário',
          avatarUrl: review.author.profile?.avatarUrl ?? null,
          city: review.author.profile?.city ?? null,
          state: review.author.profile?.state ?? null,
        },
      })),
      verification: {
        documentStatus,
        driverLicenseStatus,
        profileStatus: this.resolveProfileVerificationStatus(
          documentStatus,
          driverLicenseStatus,
        ),
      },
      vehicles: vehicles.map((vehicle) => ({
        id: vehicle.id,
        title: vehicle.title,
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        city: vehicle.city,
        state: vehicle.state,
        vehicleType: vehicle.vehicleType,
        category: vehicle.category,
        seats: vehicle.seats,
        transmission: vehicle.transmission,
        fuelType: vehicle.fuelType,
        dailyRate: Number(vehicle.dailyRate),
        motorcycleStyle: vehicle.motorcycleStyle,
        engineCc: vehicle.engineCc,
        hasAbs: vehicle.hasAbs,
        hasTopCase: vehicle.hasTopCase,
        latitude: vehicle.latitude ? Number(vehicle.latitude) : null,
        longitude: vehicle.longitude ? Number(vehicle.longitude) : null,
        ratingAverage: Number(vehicle.ratingAverage),
        reviewsCount: vehicle.reviewsCount,
        coverImage: vehicle.images[0]?.url ?? null,
        owner: {
          id: user.id,
          fullName: user.profile?.fullName ?? null,
          avatarUrl: user.profile?.avatarUrl ?? null,
          city: user.profile?.city ?? null,
          state: user.profile?.state ?? null,
          ratingAverage,
          reviewsCount: reviewsAggregate._count.rating,
        },
      })),
    };
  }

  async updateMyProfile(userId: string, dto: UpdateProfileDto) {
    const profile = await this.prisma.profile.upsert({
      where: { userId },
      update: dto,
      create: {
        userId,
        fullName: dto.fullName ?? '',
        phone: dto.phone ?? '',
        zipCode: dto.zipCode,
        addressLine: dto.addressLine,
        addressComplement: dto.addressComplement,
        city: dto.city ?? '',
        state: dto.state ?? '',
        bio: dto.bio,
        avatarUrl: dto.avatarUrl,
        documentNumber: dto.documentNumber,
        driverLicenseNumber: dto.driverLicenseNumber,
      },
    });

    return this.mapPrivateProfile(profile);
  }

  async uploadMyAvatar(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Selecione uma foto de perfil.');
    }

    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Envie um arquivo de imagem válido.');
    }

    const currentProfile = await this.prisma.profile.findUnique({
      where: { userId },
      select: {
        avatarUrl: true,
      },
    });

    const uploadedFile = await this.storageService.uploadPublicFile(
      file,
      'users',
    );

    const updatedProfile = await this.prisma.profile.upsert({
      where: { userId },
      update: {
        avatarUrl: uploadedFile.url,
      },
      create: {
        userId,
        fullName: '',
        phone: '',
        zipCode: null,
        addressLine: null,
        addressComplement: null,
        city: '',
        state: '',
        avatarUrl: uploadedFile.url,
      },
    });

    if (
      currentProfile?.avatarUrl &&
      currentProfile.avatarUrl !== uploadedFile.url
    ) {
      this.storageService
        .deletePublicFileByUrl(currentProfile.avatarUrl)
        .catch((error) => {
          this.logger.warn(
            `profile_avatar_cleanup_failed userId=${userId} message=${
              error instanceof Error ? error.message : 'Erro desconhecido'
            }`,
          );
        });
    }

    return this.mapPrivateProfile(updatedProfile);
  }

  async uploadMyDocument(userId: string, file: Express.Multer.File) {
    return this.uploadVerificationDocument(userId, file, 'document');
  }

  async uploadMyDriverLicense(userId: string, file: Express.Multer.File) {
    return this.uploadVerificationDocument(userId, file, 'driverLicense');
  }

  async getVerificationFileUrl(
    userId: string,
    type: 'document' | 'driverLicense',
  ) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: {
        documentImageUrl: true,
        driverLicenseImageUrl: true,
      },
    });

    const storedValue =
      type === 'document'
        ? profile?.documentImageUrl
        : profile?.driverLicenseImageUrl;

    if (!storedValue) {
      throw new NotFoundException('Arquivo de verificação não encontrado.');
    }

    const url = await this.storageService.getPrivateFileUrl(storedValue);

    return {
      url,
      generatedAt: new Date().toISOString(),
    };
  }

  private resolveProfileVerificationStatus(
    documentStatus: VerificationStatus,
    driverLicenseStatus: VerificationStatus,
  ) {
    if (
      documentStatus === VerificationStatus.APPROVED &&
      driverLicenseStatus === VerificationStatus.APPROVED
    ) {
      return VerificationStatus.APPROVED;
    }

    if (
      documentStatus === VerificationStatus.PENDING ||
      driverLicenseStatus === VerificationStatus.PENDING
    ) {
      return VerificationStatus.PENDING;
    }

    if (
      documentStatus === VerificationStatus.REJECTED ||
      driverLicenseStatus === VerificationStatus.REJECTED
    ) {
      return VerificationStatus.REJECTED;
    }

    return VerificationStatus.NOT_SUBMITTED;
  }

  private async uploadVerificationDocument(
    userId: string,
    file: Express.Multer.File,
    type: 'document' | 'driverLicense',
  ) {
    if (!file) {
      throw new BadRequestException('Selecione um arquivo para upload.');
    }

    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException(
        'Envie uma imagem válida para verificação.',
      );
    }

    const currentProfile = await this.prisma.profile.findUnique({
      where: { userId },
      select: {
        documentImageUrl: true,
        driverLicenseImageUrl: true,
      },
    });

    const uploadedFile = await this.storageService.uploadPrivateFile(
      file,
      'documents',
    );

    const previousFileUrl =
      type === 'document'
        ? currentProfile?.documentImageUrl
        : currentProfile?.driverLicenseImageUrl;

    if (previousFileUrl) {
      await this.storageService.deletePrivateFileByStoredValue(previousFileUrl);
    }

    const profile = await this.prisma.profile.upsert({
      where: { userId },
      update:
        type === 'document'
          ? {
              documentImageUrl: uploadedFile.key,
              documentVerificationStatus: VerificationStatus.PENDING,
            }
          : {
              driverLicenseImageUrl: uploadedFile.key,
              driverLicenseVerification: VerificationStatus.PENDING,
            },
      create:
        type === 'document'
          ? {
              userId,
              fullName: '',
              phone: '',
              zipCode: null,
              addressLine: null,
              addressComplement: null,
              city: '',
              state: '',
              documentImageUrl: uploadedFile.key,
              documentVerificationStatus: VerificationStatus.PENDING,
            }
          : {
              userId,
              fullName: '',
              phone: '',
              zipCode: null,
              addressLine: null,
              addressComplement: null,
              city: '',
              state: '',
              driverLicenseImageUrl: uploadedFile.key,
              driverLicenseVerification: VerificationStatus.PENDING,
            },
    });

    return this.mapPrivateProfile(profile);
  }

  private mapPrivateProfile(
    profile: {
      fullName: string;
      phone: string;
      zipCode?: string | null;
      addressLine?: string | null;
      addressComplement?: string | null;
      city: string;
      state: string;
      bio?: string | null;
      avatarUrl?: string | null;
      documentNumber?: string | null;
      driverLicenseNumber?: string | null;
      documentImageUrl?: string | null;
      driverLicenseImageUrl?: string | null;
      documentVerificationStatus?: VerificationStatus;
      driverLicenseVerification?: VerificationStatus;
    } | null,
  ) {
    if (!profile) {
      return null;
    }

    return {
      fullName: profile.fullName,
      phone: profile.phone,
      zipCode: profile.zipCode ?? null,
      addressLine: profile.addressLine ?? null,
      addressComplement: profile.addressComplement ?? null,
      city: profile.city,
      state: profile.state,
      bio: profile.bio ?? null,
      avatarUrl: profile.avatarUrl ?? null,
      documentNumber: profile.documentNumber ?? null,
      driverLicenseNumber: profile.driverLicenseNumber ?? null,
      hasDocumentImage: !!profile.documentImageUrl,
      hasDriverLicenseImage: !!profile.driverLicenseImageUrl,
      documentVerificationStatus:
        profile.documentVerificationStatus ?? VerificationStatus.NOT_SUBMITTED,
      driverLicenseVerification:
        profile.driverLicenseVerification ?? VerificationStatus.NOT_SUBMITTED,
    };
  }
}
