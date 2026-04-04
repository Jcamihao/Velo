import { Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TrackSiteVisitDto } from './dto/track-site-visit.dto';

export type AnalyticsPeriod = 'all' | '30d' | '7d' | 'today';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

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

    const [
      totalSiteVisits,
      firstTimeVisitors,
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
