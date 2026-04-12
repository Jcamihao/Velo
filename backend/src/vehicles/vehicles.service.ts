import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MotorcycleStyle,
  Prisma,
  Role,
  VehicleCategory,
  VehicleType,
} from '@prisma/client';
import { CacheQueueService } from '../cache-queue/cache-queue.service';
import { PrismaService } from '../prisma/prisma.service';
import { SearchAlertsService } from '../search-alerts/search-alerts.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { ListVehiclesQueryDto } from './dto/list-vehicles-query.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheQueueService: CacheQueueService,
    private readonly searchAlertsService: SearchAlertsService,
  ) {}

  async findAll(query: ListVehiclesQueryDto) {
    const cacheKey = `vehicles:list:${JSON.stringify(query)}`;
    const cached = await this.cacheQueueService.getJson(cacheKey);

    if (cached) {
      return cached;
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const andFilters: Prisma.VehicleWhereInput[] = [];

    if (query.q) {
      andFilters.push({
        OR: [
          {
            title: {
              contains: query.q,
              mode: 'insensitive',
            },
          },
          {
            brand: {
              contains: query.q,
              mode: 'insensitive',
            },
          },
          {
            model: {
              contains: query.q,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: query.q,
              mode: 'insensitive',
            },
          },
          {
            city: {
              contains: query.q,
              mode: 'insensitive',
            },
          },
          {
            state: {
              contains: query.q,
              mode: 'insensitive',
            },
          },
        ],
      });
    }

    if (query.city) {
      andFilters.push({
        city: {
          contains: query.city,
          mode: 'insensitive',
        },
      });
    }

    if (query.category) {
      andFilters.push({
        category: query.category as VehicleCategory,
      });
    }

    if (query.vehicleType) {
      andFilters.push({
        vehicleType: query.vehicleType as VehicleType,
      });
    }

    if (query.motorcycleStyle) {
      andFilters.push({
        motorcycleStyle: query.motorcycleStyle as MotorcycleStyle,
      });
    }

    if (query.minEngineCc || query.maxEngineCc) {
      andFilters.push({
        engineCc: {
          gte: query.minEngineCc,
          lte: query.maxEngineCc,
        },
      });
    }

    if (query.minPrice || query.maxPrice) {
      andFilters.push({
        dailyRate: {
          gte: query.minPrice,
          lte: query.maxPrice,
        },
      });
    }

    if (query.latitude !== undefined && query.longitude !== undefined) {
      const radiusKm = query.radiusKm ?? 25;
      const latitudeDelta = radiusKm / 111;
      const longitudeDelta =
        radiusKm /
        (111 * Math.max(Math.cos((query.latitude * Math.PI) / 180), 0.2));

      andFilters.push({
        latitude: {
          not: null,
          gte: query.latitude - latitudeDelta,
          lte: query.latitude + latitudeDelta,
        },
        longitude: {
          not: null,
          gte: query.longitude - longitudeDelta,
          lte: query.longitude + longitudeDelta,
        },
      });
    }

    const where: Prisma.VehicleWhereInput = {
      isActive: true,
      isPublished: true,
      AND: andFilters,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where,
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
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    const payload = {
      items: items.map((vehicle) => this.mapVehicleSummary(vehicle)),
      meta: {
        total,
        page,
        limit,
        hasNextPage: skip + limit < total,
      },
    };

    await this.cacheQueueService.setJson(cacheKey, payload);
    return payload;
  }

  async findMine(ownerId: string) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        ownerId,
      },
      include: {
        images: {
          orderBy: {
            position: 'asc',
          },
        },
        _count: {
          select: {
            views: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    const vehicleIds = vehicles.map((vehicle) => vehicle.id);
    const recentViewsSince = new Date();
    recentViewsSince.setDate(recentViewsSince.getDate() - 30);
    const recentViewCounts = vehicleIds.length
      ? await this.prisma.vehicleView.groupBy({
          by: ['vehicleId'],
          where: {
            vehicleId: {
              in: vehicleIds,
            },
            createdAt: {
              gte: recentViewsSince,
            },
          },
          _count: {
            vehicleId: true,
          },
        })
      : [];
    const recentViewCountsByVehicleId = new Map(
      recentViewCounts.map((item) => [item.vehicleId, item._count.vehicleId]),
    );

    return vehicles.map((vehicle) => ({
      id: vehicle.id,
      title: vehicle.title,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      plate: vehicle.plate,
      city: vehicle.city,
      state: vehicle.state,
      vehicleType: vehicle.vehicleType,
      category: vehicle.category,
      transmission: vehicle.transmission,
      fuelType: vehicle.fuelType,
      seats: vehicle.seats,
      dailyRate: Number(vehicle.dailyRate),
      motorcycleStyle: vehicle.motorcycleStyle,
      engineCc: vehicle.engineCc,
      hasAbs: vehicle.hasAbs,
      hasTopCase: vehicle.hasTopCase,
      latitude: vehicle.latitude ? Number(vehicle.latitude) : null,
      longitude: vehicle.longitude ? Number(vehicle.longitude) : null,
      description: vehicle.description,
      addressLine: vehicle.addressLine,
      isActive: vehicle.isActive,
      isPublished: vehicle.isPublished,
      coverImage: vehicle.images[0]?.url ?? null,
      images: vehicle.images.map((image) => ({
        id: image.id,
        url: image.url,
        alt: image.alt,
        position: image.position,
      })),
      ratingAverage: Number(vehicle.ratingAverage),
      reviewsCount: vehicle.reviewsCount,
      viewsCount: vehicle._count.views,
      viewsLast30Days: recentViewCountsByVehicleId.get(vehicle.id) ?? 0,
    }));
  }

  async findPublicSummariesByIds(vehicleIds: string[]) {
    if (!vehicleIds.length) {
      return [];
    }

    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        id: {
          in: vehicleIds,
        },
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

    const summariesById = new Map(
      vehicles.map((vehicle) => [vehicle.id, this.mapVehicleSummary(vehicle)]),
    );

    return vehicleIds
      .map((vehicleId) => summariesById.get(vehicleId))
      .filter((vehicle): vehicle is NonNullable<typeof vehicle> => !!vehicle);
  }

  async findOne(vehicleId: string) {
    const cacheKey = `vehicles:detail:${vehicleId}`;
    const cached = await this.cacheQueueService.getJson(cacheKey);

    if (cached) {
      return cached;
    }

    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        isActive: true,
      },
      include: {
        images: {
          orderBy: {
            position: 'asc',
          },
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
        reviews: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
          include: {
            author: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado.');
    }

    const payload = this.mapVehicleDetail(vehicle);
    await this.cacheQueueService.setJson(cacheKey, payload);

    return payload;
  }

  async create(ownerId: string, dto: CreateVehicleDto) {
    const vehicle = await this.prisma.vehicle.create({
      data: {
        ownerId,
        title: dto.title,
        brand: dto.brand,
        model: dto.model,
        year: dto.year,
        plate: dto.plate.toUpperCase(),
        city: dto.city,
        state: dto.state.toUpperCase(),
        vehicleType: dto.vehicleType ?? VehicleType.CAR,
        category: dto.category,
        transmission: dto.transmission,
        fuelType: dto.fuelType,
        seats: dto.seats,
        dailyRate: dto.dailyRate,
        motorcycleStyle: dto.motorcycleStyle,
        engineCc: dto.engineCc,
        hasAbs: dto.hasAbs,
        hasTopCase: dto.hasTopCase,
        description: dto.description,
        addressLine: dto.addressLine,
        latitude: dto.latitude,
        longitude: dto.longitude,
        isPublished: dto.isPublished ?? true,
      },
      include: {
        images: true,
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

    await this.cacheQueueService.invalidateByPrefix('vehicles:list:');
    if (vehicle.isActive && vehicle.isPublished) {
      await this.searchAlertsService.notifyMatchingUsers(vehicle.id);
    }
    return this.mapVehicleDetail(vehicle);
  }

  async update(ownerId: string, vehicleId: string, dto: UpdateVehicleDto) {
    await this.ensureVehicleOwnership(ownerId, vehicleId);

    const vehicle = await this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        ...dto,
        plate: dto.plate ? dto.plate.toUpperCase() : undefined,
        state: dto.state ? dto.state.toUpperCase() : undefined,
      },
      include: {
        images: {
          orderBy: {
            position: 'asc',
          },
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

    await this.invalidateVehicleCache(vehicleId);
    if (vehicle.isActive && vehicle.isPublished) {
      await this.searchAlertsService.notifyMatchingUsers(vehicle.id);
    }
    return this.mapVehicleDetail(vehicle);
  }

  async remove(ownerId: string, vehicleId: string) {
    await this.ensureVehicleOwnership(ownerId, vehicleId);

    const vehicle = await this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        isActive: false,
        isPublished: false,
      },
    });

    await this.invalidateVehicleCache(vehicleId);
    return {
      message: 'Veículo desativado com sucesso.',
      vehicleId: vehicle.id,
    };
  }

  async ensureVehicleOwnership(ownerId: string, vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado.');
    }

    if (vehicle.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Você não tem permissão para alterar este veículo.',
      );
    }

    return vehicle;
  }

  async ensureVehicleExists(vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle || !vehicle.isActive) {
      throw new NotFoundException('Veículo não encontrado.');
    }

    return vehicle;
  }

  async invalidateVehicleCache(vehicleId: string) {
    await Promise.all([
      this.cacheQueueService.del(`vehicles:detail:${vehicleId}`),
      this.cacheQueueService.invalidateByPrefix('vehicles:list:'),
    ]);
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
        ...this.mapOwnerSummary(vehicle.owner),
      },
    };
  }

  private mapVehicleDetail(vehicle: any) {
    return {
      ...this.mapVehicleSummary({
        ...vehicle,
        images: vehicle.images,
      }),
      description: vehicle.description,
      addressLine: vehicle.addressLine,
      isPublished: vehicle.isPublished,
      images: vehicle.images.map((image: any) => ({
        id: image.id,
        url: image.url,
        alt: image.alt,
        position: image.position,
      })),
      reviews: (vehicle.reviews ?? []).map((review: any) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        author: {
          id: review.author.id,
          fullName: review.author.profile?.fullName ?? null,
        },
      })),
    };
  }

  private mapOwnerSummary(owner: {
    id: string;
    profile?: {
      fullName?: string | null;
      avatarUrl?: string | null;
      city?: string | null;
      state?: string | null;
    } | null;
    userReviewsReceived?: Array<{ rating: number }>;
  }) {
    const reviews = Array.isArray(owner.userReviewsReceived)
      ? owner.userReviewsReceived
      : [];
    const reviewsCount = reviews.length;
    const ratingAverage = reviewsCount
      ? Number(
          (
            reviews.reduce(
              (total, review) => total + Number(review.rating ?? 0),
              0,
            ) / reviewsCount
          ).toFixed(1),
        )
      : 0;

    return {
      id: owner.id,
      fullName: owner.profile?.fullName ?? null,
      avatarUrl: owner.profile?.avatarUrl ?? null,
      city: owner.profile?.city ?? null,
      state: owner.profile?.state ?? null,
      ratingAverage,
      reviewsCount,
    };
  }
}
