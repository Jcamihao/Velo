import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, UserStatus, VerificationStatus } from '@prisma/client';
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
    const [user, reviewsAggregate, reviews, vehicles, ownerBookings] =
      await Promise.all([
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
      this.prisma.booking.findMany({
        where: {
          ownerId: userId,
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
          statusHistory: {
            select: {
              toStatus: true,
              changedById: true,
              changedAt: true,
            },
            orderBy: {
              changedAt: 'asc',
            },
          },
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
    const ownerResponseStatuses: BookingStatus[] = [
      BookingStatus.APPROVED,
      BookingStatus.REJECTED,
      BookingStatus.CANCELLED,
    ];
    const decisionStatuses: BookingStatus[] = [
      BookingStatus.APPROVED,
      BookingStatus.IN_PROGRESS,
      BookingStatus.COMPLETED,
      BookingStatus.REJECTED,
    ];
    const approvedStatuses: BookingStatus[] = [
      BookingStatus.APPROVED,
      BookingStatus.IN_PROGRESS,
      BookingStatus.COMPLETED,
    ];
    const completedBookingsCount = ownerBookings.filter(
      (booking) => booking.status === BookingStatus.COMPLETED,
    ).length;
    const responseDelaysInHours = ownerBookings
      .map((booking) => {
        const ownerResponse = booking.statusHistory.find(
          (event) =>
            event.changedById === userId &&
            ownerResponseStatuses.includes(event.toStatus),
        );

        if (!ownerResponse) {
          return null;
        }

        return Number(
          (
            (ownerResponse.changedAt.getTime() - booking.createdAt.getTime()) /
            (1000 * 60 * 60)
          ).toFixed(1),
        );
      })
      .filter((value): value is number => value !== null);
    const responseRate = this.toPercentage(
      responseDelaysInHours.length,
      ownerBookings.length,
    );
    const decisionBookings = ownerBookings.filter((booking) =>
      decisionStatuses.includes(booking.status),
    );
    const approvedDecisionCount = decisionBookings.filter((booking) =>
      approvedStatuses.includes(booking.status),
    ).length;
    const approvalRate = this.toPercentage(
      approvedDecisionCount,
      decisionBookings.length,
    );
    const ownerCancelledCount = ownerBookings.filter((booking) =>
      booking.statusHistory.some(
        (event) =>
          event.toStatus === BookingStatus.CANCELLED &&
          event.changedById === userId,
      ),
    ).length;
    const cancellationRate = this.toPercentage(
      ownerCancelledCount,
      ownerBookings.length,
    );
    const averageResponseHours = responseDelaysInHours.length
      ? Number(
          (
            responseDelaysInHours.reduce((total, value) => total + value, 0) /
            responseDelaysInHours.length
          ).toFixed(1),
        )
      : null;

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
      ratingAverage: Number((reviewsAggregate._avg.rating ?? 0).toFixed(1)),
      reviewsCount: reviewsAggregate._count.rating,
      activeListingsCount: vehicles.length,
      trustMetrics: {
        completedBookingsCount,
        responseRate,
        averageResponseHours,
        approvalRate,
        cancellationRate,
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
        bookingApprovalMode: vehicle.bookingApprovalMode,
        cancellationPolicy: vehicle.cancellationPolicy,
        seats: vehicle.seats,
        transmission: vehicle.transmission,
        fuelType: vehicle.fuelType,
        dailyRate: Number(vehicle.dailyRate),
        addons: Array.isArray(vehicle.addons) ? vehicle.addons : [],
        firstBookingDiscountPercent: vehicle.firstBookingDiscountPercent ?? 0,
        weeklyDiscountPercent: vehicle.weeklyDiscountPercent ?? 0,
        couponCode: vehicle.couponCode ?? null,
        couponDiscountPercent: vehicle.couponDiscountPercent ?? 0,
        weekendSurchargePercent: vehicle.weekendSurchargePercent ?? 0,
        holidaySurchargePercent: vehicle.holidaySurchargePercent ?? 0,
        highDemandSurchargePercent: vehicle.highDemandSurchargePercent ?? 0,
        advanceBookingDiscountPercent:
          vehicle.advanceBookingDiscountPercent ?? 0,
        advanceBookingDaysThreshold: vehicle.advanceBookingDaysThreshold ?? 0,
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
          ratingAverage: Number((reviewsAggregate._avg.rating ?? 0).toFixed(1)),
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

  private toPercentage(part: number, total: number) {
    if (!total) {
      return 0;
    }

    return Math.round((part / total) * 100);
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
