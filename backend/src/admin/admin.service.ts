import { Injectable, NotFoundException } from '@nestjs/common';
import {
  PrivacyRequestStatus,
  UserStatus,
  VerificationStatus,
} from '@prisma/client';
import { CacheQueueService } from '../cache-queue/cache-queue.service';
import { PrivacyService } from '../privacy/privacy.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProfilesService } from '../profiles/profiles.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheQueueService: CacheQueueService,
    private readonly profilesService: ProfilesService,
    private readonly privacyService: PrivacyService,
  ) {}

  async getDashboard() {
    const [users, vehicles, bookings, privacyRequests] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.vehicle.count(),
      this.prisma.booking.count(),
      this.prisma.privacyRequest.count(),
    ]);

    return {
      totals: {
        users,
        vehicles,
        bookings,
        privacyRequests,
      },
    };
  }

  async getUsers() {
    const users = await this.prisma.user.findMany({
      include: {
        profile: {
          select: {
            fullName: true,
            city: true,
            state: true,
            avatarUrl: true,
            documentVerificationStatus: true,
            driverLicenseVerification: true,
            documentImageUrl: true,
            driverLicenseImageUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return users.map((user) => ({
      ...user,
      profile: user.profile
        ? {
            fullName: user.profile.fullName,
            city: user.profile.city,
            state: user.profile.state,
            avatarUrl: user.profile.avatarUrl,
            documentVerificationStatus: user.profile.documentVerificationStatus,
            driverLicenseVerification: user.profile.driverLicenseVerification,
            hasDocumentImage: !!user.profile.documentImageUrl,
            hasDriverLicenseImage: !!user.profile.driverLicenseImageUrl,
          }
        : null,
    }));
  }

  async getVehicles() {
    return this.prisma.vehicle.findMany({
      include: {
        owner: {
          include: {
            profile: true,
          },
        },
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
    });
  }

  async getBookings() {
    return this.prisma.booking.findMany({
      include: {
        vehicle: true,
        renter: {
          include: {
            profile: true,
          },
        },
        owner: {
          include: {
            profile: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async blockUser(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.BLOCKED },
      include: {
        profile: true,
      },
    });
  }

  async approveUserDocument(userId: string) {
    return this.updateVerificationStatus(
      userId,
      'documentVerificationStatus',
      VerificationStatus.APPROVED,
    );
  }

  async rejectUserDocument(userId: string) {
    return this.updateVerificationStatus(
      userId,
      'documentVerificationStatus',
      VerificationStatus.REJECTED,
    );
  }

  async approveUserDriverLicense(userId: string) {
    return this.updateVerificationStatus(
      userId,
      'driverLicenseVerification',
      VerificationStatus.APPROVED,
    );
  }

  async rejectUserDriverLicense(userId: string) {
    return this.updateVerificationStatus(
      userId,
      'driverLicenseVerification',
      VerificationStatus.REJECTED,
    );
  }

  async deactivateVehicle(vehicleId: string) {
    const vehicle = await this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        isActive: false,
        isPublished: false,
      },
    });

    await this.cacheQueueService.del(`vehicles:detail:${vehicleId}`);
    await this.cacheQueueService.invalidateByPrefix('vehicles:list:');

    return vehicle;
  }

  async getUserVerificationFileUrl(
    userId: string,
    type: 'document' | 'driverLicense',
  ) {
    return this.profilesService.getVerificationFileUrl(userId, type);
  }

  async getPrivacyRequests() {
    return this.privacyService.getAdminRequests();
  }

  async updatePrivacyRequest(
    requestId: string,
    status: PrivacyRequestStatus,
    resolutionNotes?: string,
  ) {
    return this.privacyService.updateRequestStatus({
      requestId,
      status,
      resolutionNotes,
    });
  }

  private async updateVerificationStatus(
    userId: string,
    field: 'documentVerificationStatus' | 'driverLicenseVerification',
    status: VerificationStatus,
  ) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Perfil do usuário não encontrado.');
    }

    return this.prisma.profile.update({
      where: { userId },
      data: {
        [field]: status,
      },
    });
  }
}
