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
    return this.prisma.profile.findUnique({
      where: { userId },
    });
  }

  async getPublicProfile(userId: string) {
    const [user, reviewsAggregate, vehicles] = await Promise.all([
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
      this.prisma.review.aggregate({
        where: {
          ownerId: userId,
        },
        _avg: {
          rating: true,
        },
        _count: {
          rating: true,
        },
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
      user.profile?.documentVerificationStatus ?? VerificationStatus.NOT_SUBMITTED;
    const driverLicenseStatus =
      user.profile?.driverLicenseVerification ?? VerificationStatus.NOT_SUBMITTED;

    return {
      id: user.id,
      role: user.role,
      memberSince: user.createdAt,
      fullName:
        user.profile?.fullName?.trim() ||
        user.email.split('@')[0] ||
        'Usuário',
      avatarUrl: user.profile?.avatarUrl ?? null,
      bio: user.profile?.bio ?? null,
      city: user.profile?.city ?? null,
      state: user.profile?.state ?? null,
      ratingAverage: Number((reviewsAggregate._avg.rating ?? 0).toFixed(1)),
      reviewsCount: reviewsAggregate._count.rating,
      activeListingsCount: vehicles.length,
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
        category: vehicle.category,
        seats: vehicle.seats,
        transmission: vehicle.transmission,
        fuelType: vehicle.fuelType,
        dailyRate: Number(vehicle.dailyRate),
        ratingAverage: Number(vehicle.ratingAverage),
        reviewsCount: vehicle.reviewsCount,
        coverImage: vehicle.images[0]?.url ?? null,
        owner: {
          id: user.id,
          fullName: user.profile?.fullName ?? null,
          city: user.profile?.city ?? null,
          state: user.profile?.state ?? null,
        },
      })),
    };
  }

  async updateMyProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.profile.upsert({
      where: { userId },
      update: dto,
      create: {
        userId,
        fullName: dto.fullName ?? '',
        phone: dto.phone ?? '',
        city: dto.city ?? '',
        state: dto.state ?? '',
        bio: dto.bio,
        avatarUrl: dto.avatarUrl,
        documentNumber: dto.documentNumber,
        driverLicenseNumber: dto.driverLicenseNumber,
      },
    });
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

    const uploadedFile = await this.storageService.uploadPublicFile(file, 'users');

    const updatedProfile = await this.prisma.profile.upsert({
      where: { userId },
      update: {
        avatarUrl: uploadedFile.url,
      },
      create: {
        userId,
        fullName: '',
        phone: '',
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

    return updatedProfile;
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
}
