import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async listMyFavorites(userId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: {
        userId,
        vehicle: {
          isActive: true,
          isPublished: true,
        },
      },
      include: {
        vehicle: {
          include: {
            images: {
              orderBy: {
                position: 'asc',
              },
              take: 1,
            },
            owner: {
              include: {
                profile: true,
                userReviewsReceived: {
                  select: {
                    rating: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return favorites.map((favorite) =>
      this.mapVehicleSummary(favorite.vehicle),
    );
  }

  async addFavorite(userId: string, vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
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
        owner: {
          include: {
            profile: true,
            userReviewsReceived: {
              select: {
                rating: true,
              },
            },
          },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado.');
    }

    await this.prisma.favorite.upsert({
      where: {
        userId_vehicleId: {
          userId,
          vehicleId,
        },
      },
      create: {
        userId,
        vehicleId,
      },
      update: {},
    });

    return {
      message: 'Veículo adicionado aos favoritos.',
      vehicle: this.mapVehicleSummary(vehicle),
    };
  }

  async removeFavorite(userId: string, vehicleId: string) {
    await this.prisma.favorite.deleteMany({
      where: {
        userId,
        vehicleId,
      },
    });

    return {
      message: 'Veículo removido dos favoritos.',
      vehicleId,
    };
  }

  private mapVehicleSummary(vehicle: any) {
    return {
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
        id: vehicle.owner.id,
        fullName: vehicle.owner.profile?.fullName ?? null,
        avatarUrl: vehicle.owner.profile?.avatarUrl ?? null,
        city: vehicle.owner.profile?.city ?? null,
        state: vehicle.owner.profile?.state ?? null,
        ratingAverage: this.calculateOwnerRatingAverage(
          vehicle.owner.userReviewsReceived,
        ),
        reviewsCount: Array.isArray(vehicle.owner.userReviewsReceived)
          ? vehicle.owner.userReviewsReceived.length
          : 0,
      },
    };
  }

  private calculateOwnerRatingAverage(reviews: Array<{ rating: number }> = []) {
    if (!reviews.length) {
      return 0;
    }

    return Number(
      (
        reviews.reduce(
          (total, review) => total + Number(review.rating ?? 0),
          0,
        ) / reviews.length
      ).toFixed(1),
    );
  }
}
