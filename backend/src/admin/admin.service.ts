import { Injectable, NotFoundException } from '@nestjs/common';
import { UserStatus, VerificationStatus } from '@prisma/client';
import { CacheQueueService } from '../cache-queue/cache-queue.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheQueueService: CacheQueueService,
  ) {}

  async getDashboard() {
    const [users, vehicles, bookings] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.vehicle.count(),
      this.prisma.booking.count(),
    ]);

    return {
      totals: {
        users,
        vehicles,
        bookings,
      },
    };
  }

  async getUsers() {
    return this.prisma.user.findMany({
      include: {
        profile: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
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
