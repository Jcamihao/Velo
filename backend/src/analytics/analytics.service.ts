import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { TrackSiteVisitDto } from './dto/track-site-visit.dto';
import { TrackVehicleViewDto } from './dto/track-vehicle-view.dto';

export type AnalyticsPeriod = 'all' | '30d' | '7d' | 'today';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vehiclesService: VehiclesService,
  ) {}

  async trackSiteVisit(dto: TrackSiteVisitDto, userAgent?: string) {
    const existingVisit = await this.prisma.siteVisit.findFirst({
      where: {
        visitorId: dto.visitorId,
      },
      select: {
        id: true,
      },
    });

    const visit = await this.prisma.siteVisit.create({
      data: {
        visitorId: dto.visitorId,
        path: dto.path,
        referrer: dto.referrer,
        userAgent,
        isFirstVisit: !existingVisit,
      },
      select: {
        id: true,
        isFirstVisit: true,
        createdAt: true,
      },
    });

    return visit;
  }

  async trackVehicleView(dto: TrackVehicleViewDto, userAgent?: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: dto.vehicleId,
        isActive: true,
        isPublished: true,
      },
      select: {
        id: true,
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Anúncio não encontrado.');
    }

    return this.prisma.vehicleView.create({
      data: {
        vehicleId: dto.vehicleId,
        visitorId: dto.visitorId,
        path: dto.path,
        referrer: dto.referrer,
        userAgent,
      },
      select: {
        id: true,
        vehicleId: true,
        createdAt: true,
      },
    });
  }

  async getMostViewedVehicles({
    period = '30d',
    limit = 8,
  }: {
    period?: AnalyticsPeriod;
    limit?: number;
  }) {
    const createdAtFilter = this.buildCreatedAtFilter(period);
    const ranking = await this.prisma.vehicleView.groupBy({
      by: ['vehicleId'],
      where: {
        createdAt: createdAtFilter,
        vehicle: {
          isActive: true,
          isPublished: true,
        },
      },
      _count: {
        vehicleId: true,
      },
      orderBy: {
        _count: {
          vehicleId: 'desc',
        },
      },
      take: limit,
    });
    const vehicleIds = ranking.map((item) => item.vehicleId);
    const vehicles = await this.vehiclesService.findPublicSummariesByIds(vehicleIds);
    const viewCountsByVehicleId = new Map(
      ranking.map((item) => [item.vehicleId, item._count.vehicleId]),
    );

    return {
      items: vehicles.map((vehicle) => ({
        vehicle,
        viewCount: viewCountsByVehicleId.get(vehicle.id) ?? 0,
      })),
      meta: {
        period,
        limit,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  async getSummary(period: AnalyticsPeriod = 'all') {
    const createdAtFilter = this.buildCreatedAtFilter(period);
    const userWhere: Prisma.UserWhereInput = createdAtFilter
      ? { createdAt: createdAtFilter }
      : {};
    const vehicleWhere: Prisma.VehicleWhereInput = createdAtFilter
      ? { createdAt: createdAtFilter }
      : {};
    const siteVisitWhere: Prisma.SiteVisitWhereInput = createdAtFilter
      ? { createdAt: createdAtFilter }
      : {};
    const vehicleViewWhere: Prisma.VehicleViewWhereInput = createdAtFilter
      ? { createdAt: createdAtFilter }
      : {};

    const [
      totalSiteVisits,
      firstTimeVisitors,
      totalVehicleViews,
      registeredUsers,
      registeredListings,
      commonUsers,
      admins,
    ] = await Promise.all([
      this.prisma.siteVisit.count({
        where: siteVisitWhere,
      }),
      this.prisma.siteVisit.count({
        where: {
          ...siteVisitWhere,
          isFirstVisit: true,
        },
      }),
      this.prisma.vehicleView.count({
        where: vehicleViewWhere,
      }),
      this.prisma.user.count({
        where: userWhere,
      }),
      this.prisma.vehicle.count({
        where: vehicleWhere,
      }),
      this.prisma.user.count({
        where: {
          ...userWhere,
          role: Role.USER,
        },
      }),
      this.prisma.user.count({
        where: {
          ...userWhere,
          role: Role.ADMIN,
        },
      }),
    ]);

    return {
      totalSiteVisits,
      firstTimeVisitors,
      totalVehicleViews,
      registeredUsers,
      registeredListings,
      commonUsers,
      admins,
      period,
      generatedAt: new Date().toISOString(),
    };
  }

  private buildCreatedAtFilter(period: AnalyticsPeriod) {
    if (period === 'all') {
      return undefined;
    }

    const now = new Date();

    if (period === 'today') {
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      return { gte: startOfDay };
    }

    const days = period === '30d' ? 30 : 7;
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);

    return { gte: startDate };
  }
}
