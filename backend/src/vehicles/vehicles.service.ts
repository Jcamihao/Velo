import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingApprovalMode,
  BookingStatus,
  CancellationPolicy,
  MotorcycleStyle,
  Prisma,
  Role,
  VehicleCategory,
  VehicleType,
} from '@prisma/client';
import { CacheQueueService } from '../cache-queue/cache-queue.service';
import { VehiclePricingService } from '../pricing/vehicle-pricing.service';
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
    private readonly vehiclePricingService: VehiclePricingService,
    private readonly searchAlertsService: SearchAlertsService,
  ) {}

  async findAll(query: ListVehiclesQueryDto) {
    this.validateDateRange(query.startDate, query.endDate);

    const cacheKey = `vehicles:list:${JSON.stringify(query)}`;
    const cached = await this.cacheQueueService.getJson(cacheKey);

    if (cached) {
      return cached;
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

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

    if (query.bookingApprovalMode) {
      andFilters.push({
        bookingApprovalMode: query.bookingApprovalMode as BookingApprovalMode,
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

    if (startDate && endDate) {
      andFilters.push(
        {
          bookings: {
            none: {
              status: {
                in: [BookingStatus.APPROVED, BookingStatus.IN_PROGRESS],
              },
              startDate: {
                lt: endDate,
              },
              endDate: {
                gt: startDate,
              },
            },
          },
        },
        {
          blockedDates: {
            none: {
              startDate: {
                lt: endDate,
              },
              endDate: {
                gt: startDate,
              },
            },
          },
        },
      );
    }

    if (query.latitude !== undefined && query.longitude !== undefined) {
      const radiusKm = query.radiusKm ?? 25;
      const latitudeDelta = radiusKm / 111;
      const longitudeDelta =
        radiusKm /
        (111 *
          Math.max(
            Math.cos((query.latitude * Math.PI) / 180),
            0.2,
          ));

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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

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
      bookingApprovalMode: vehicle.bookingApprovalMode,
      cancellationPolicy: vehicle.cancellationPolicy,
      transmission: vehicle.transmission,
      fuelType: vehicle.fuelType,
      seats: vehicle.seats,
      dailyRate: Number(vehicle.dailyRate),
      addons: this.normalizeAddons(vehicle.addons),
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
    }));
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

  async getPricingPreview(
    vehicleId: string,
    startDate: string,
    endDate: string,
  ) {
    return this.vehiclePricingService.getPricingPreview(
      vehicleId,
      startDate,
      endDate,
    );
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
        bookingApprovalMode:
          dto.bookingApprovalMode ?? BookingApprovalMode.MANUAL,
        cancellationPolicy:
          dto.cancellationPolicy ?? CancellationPolicy.FLEXIBLE,
        transmission: dto.transmission,
        fuelType: dto.fuelType,
        seats: dto.seats,
        dailyRate: dto.dailyRate,
        addons: this.normalizeAddons(dto.addons),
        firstBookingDiscountPercent: dto.firstBookingDiscountPercent ?? 0,
        weeklyDiscountPercent: dto.weeklyDiscountPercent ?? 0,
        couponCode: this.normalizeCouponCode(dto.couponCode),
        couponDiscountPercent: dto.couponDiscountPercent ?? 0,
        weekendSurchargePercent: dto.weekendSurchargePercent ?? 0,
        holidaySurchargePercent: dto.holidaySurchargePercent ?? 0,
        highDemandSurchargePercent: dto.highDemandSurchargePercent ?? 0,
        advanceBookingDiscountPercent:
          dto.advanceBookingDiscountPercent ?? 0,
        advanceBookingDaysThreshold: dto.advanceBookingDaysThreshold ?? 0,
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
        addons: dto.addons ? this.normalizeAddons(dto.addons) : undefined,
        couponCode:
          dto.couponCode !== undefined
            ? this.normalizeCouponCode(dto.couponCode)
            : undefined,
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

  private validateDateRange(startDate?: string, endDate?: string) {
    if (!startDate || !endDate) {
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      throw new BadRequestException(
        'O período de busca precisa ter data final maior que a inicial.',
      );
    }
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
      bookingApprovalMode: vehicle.bookingApprovalMode,
      cancellationPolicy: vehicle.cancellationPolicy,
      seats: vehicle.seats,
      transmission: vehicle.transmission,
      fuelType: vehicle.fuelType,
      dailyRate: Number(vehicle.dailyRate),
      addons: this.normalizeAddons(vehicle.addons),
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
        id: vehicle.owner.id,
        fullName: vehicle.owner.profile?.fullName ?? null,
        city: vehicle.owner.profile?.city ?? null,
        state: vehicle.owner.profile?.state ?? null,
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

  private normalizeAddons(addons: unknown) {
    if (!Array.isArray(addons)) {
      return [];
    }

    return addons
      .slice(0, 8)
      .map((addon, index) => {
        const entry = addon as Record<string, unknown>;
        const name = String(entry.name ?? '').trim();
        const description = String(entry.description ?? '').trim();
        const price = Number(entry.price ?? 0);

        if (!name || Number.isNaN(price) || price < 0) {
          return null;
        }

        return {
          id:
            String(entry.id ?? '').trim() ||
            `addon-${index + 1}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          name,
          description,
          price: Number(price.toFixed(2)),
          enabled: entry.enabled !== false,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => !!entry);
  }

  private normalizeCouponCode(value: unknown) {
    const couponCode = String(value ?? '').trim().toUpperCase();
    return couponCode || null;
  }
}
