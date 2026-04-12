import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSearchAlertDto } from './dto/create-search-alert.dto';

type NormalizedAlertFilters = {
  q?: string;
  city?: string;
  vehicleType?: string;
  category?: string;
  motorcycleStyle?: string;
  minEngineCc?: number;
  maxEngineCc?: number;
  minPrice?: number;
  maxPrice?: number;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
};

@Injectable()
export class SearchAlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateSearchAlertDto) {
    const filters = this.normalizeFilters(dto.filters);

    if (!Object.keys(filters).length) {
      throw new BadRequestException(
        'Escolha pelo menos um filtro para salvar o alerta.',
      );
    }

    const queryHash = JSON.stringify(filters);
    const title = dto.title?.trim() || this.buildDefaultTitle(filters);

    const alert = await this.prisma.searchAlert.upsert({
      where: {
        userId_queryHash: {
          userId,
          queryHash,
        },
      },
      update: {
        title,
        filters: filters as Prisma.InputJsonValue,
        isActive: true,
      },
      create: {
        userId,
        title,
        filters: filters as Prisma.InputJsonValue,
        queryHash,
      },
    });

    return this.mapAlert(alert);
  }

  async listMine(userId: string, includeInactive = false) {
    const alerts = await this.prisma.searchAlert.findMany({
      where: {
        userId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { createdAt: 'desc' },
    });

    return alerts.map((alert) => this.mapAlert(alert));
  }

  async remove(userId: string, alertId: string) {
    const result = await this.prisma.searchAlert.deleteMany({
      where: {
        id: alertId,
        userId,
      },
    });

    if (!result.count) {
      throw new NotFoundException('Alerta de busca não encontrado.');
    }

    return {
      message: 'Alerta removido com sucesso.',
      alertId,
    };
  }

  async notifyMatchingUsers(vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        isActive: true,
        isPublished: true,
      },
    });

    if (!vehicle) {
      return;
    }

    const alerts = await this.prisma.searchAlert.findMany({
      where: {
        isActive: true,
        userId: {
          not: vehicle.ownerId,
        },
        matches: {
          none: {
            vehicleId,
          },
        },
      },
    });

    for (const alert of alerts) {
      const filters = this.normalizeFilters(
        (alert.filters ?? {}) as Record<string, unknown>,
      );

      if (!this.matchesVehicleFilters(vehicle, filters)) {
        continue;
      }

      await this.prisma.searchAlertMatch.create({
        data: {
          searchAlertId: alert.id,
          vehicleId,
        },
      });

      await this.notificationsService.create({
        userId: alert.userId,
        type: NotificationType.SYSTEM_ALERT,
        title: 'Novo veículo para sua busca',
        message: `${vehicle.title} acabou de entrar no ar e combina com o alerta "${alert.title || 'Busca salva'}".`,
        metadata: {
          vehicleId,
          searchAlertId: alert.id,
        },
      });
    }
  }

  private mapAlert(alert: {
    id: string;
    title: string | null;
    filters: Prisma.JsonValue;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: alert.id,
      title: alert.title,
      filters: alert.filters,
      isActive: alert.isActive,
      createdAt: alert.createdAt,
      updatedAt: alert.updatedAt,
    };
  }

  private buildDefaultTitle(filters: NormalizedAlertFilters) {
    if (filters.vehicleType === 'MOTORCYCLE') {
      return filters.city ? `Motos em ${filters.city}` : 'Alerta de motos';
    }

    if (filters.vehicleType === 'CAR') {
      return filters.city ? `Carros em ${filters.city}` : 'Alerta de carros';
    }

    return filters.city ? `Veículos em ${filters.city}` : 'Alerta de veículos';
  }

  private normalizeFilters(filters: Record<string, unknown>): NormalizedAlertFilters {
    const normalized: NormalizedAlertFilters = {};

    const readString = (value: unknown) => String(value ?? '').trim();
    const readNumber = (value: unknown) => {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? undefined : parsed;
    };

    if (readString(filters.q)) {
      normalized.q = readString(filters.q);
    }

    if (readString(filters.city)) {
      normalized.city = readString(filters.city);
    }

    if (readString(filters.vehicleType)) {
      normalized.vehicleType = readString(filters.vehicleType);
    }

    if (readString(filters.category)) {
      normalized.category = readString(filters.category);
    }

    if (readString(filters.motorcycleStyle)) {
      normalized.motorcycleStyle = readString(filters.motorcycleStyle);
    }

    normalized.minEngineCc = readNumber(filters.minEngineCc);
    normalized.maxEngineCc = readNumber(filters.maxEngineCc);
    normalized.minPrice = readNumber(filters.minPrice);
    normalized.maxPrice = readNumber(filters.maxPrice);
    normalized.latitude = readNumber(filters.latitude);
    normalized.longitude = readNumber(filters.longitude);
    normalized.radiusKm = readNumber(filters.radiusKm);

    return Object.fromEntries(
      Object.entries(normalized).filter(([, value]) => value !== undefined && value !== ''),
    ) as NormalizedAlertFilters;
  }

  private matchesVehicleFilters(
    vehicle: {
      title: string;
      brand: string;
      model: string;
      description: string;
      city: string;
      state: string;
      vehicleType: string;
      category: string;
      motorcycleStyle: string | null;
      engineCc: number | null;
      dailyRate: Prisma.Decimal | number | string;
      latitude: Prisma.Decimal | number | null;
      longitude: Prisma.Decimal | number | null;
    },
    filters: NormalizedAlertFilters,
  ) {
    if (filters.q) {
      const haystack = [
        vehicle.title,
        vehicle.brand,
        vehicle.model,
        vehicle.description,
        vehicle.city,
        vehicle.state,
      ]
        .join(' ')
        .toLowerCase();

      if (!haystack.includes(filters.q.toLowerCase())) {
        return false;
      }
    }

    if (
      filters.city &&
      !vehicle.city.toLowerCase().includes(filters.city.toLowerCase())
    ) {
      return false;
    }

    if (filters.vehicleType && vehicle.vehicleType !== filters.vehicleType) {
      return false;
    }

    if (filters.category && vehicle.category !== filters.category) {
      return false;
    }

    if (
      filters.motorcycleStyle &&
      vehicle.motorcycleStyle !== filters.motorcycleStyle
    ) {
      return false;
    }

    const engineCc = vehicle.engineCc ?? 0;

    if (filters.minEngineCc !== undefined && engineCc < filters.minEngineCc) {
      return false;
    }

    if (filters.maxEngineCc !== undefined && engineCc > filters.maxEngineCc) {
      return false;
    }

    const dailyRate = Number(vehicle.dailyRate);

    if (filters.minPrice !== undefined && dailyRate < filters.minPrice) {
      return false;
    }

    if (filters.maxPrice !== undefined && dailyRate > filters.maxPrice) {
      return false;
    }

    if (filters.latitude !== undefined && filters.longitude !== undefined) {
      if (vehicle.latitude === null || vehicle.longitude === null) {
        return false;
      }

      const radiusKm = filters.radiusKm ?? 25;
      const latitudeDelta = radiusKm / 111;
      const longitudeDelta =
        radiusKm /
        (111 *
          Math.max(Math.cos((filters.latitude * Math.PI) / 180), 0.2));
      const latitude = Number(vehicle.latitude);
      const longitude = Number(vehicle.longitude);

      if (
        latitude < filters.latitude - latitudeDelta ||
        latitude > filters.latitude + latitudeDelta ||
        longitude < filters.longitude - longitudeDelta ||
        longitude > filters.longitude + longitudeDelta
      ) {
        return false;
      }
    }

    return true;
  }
}
