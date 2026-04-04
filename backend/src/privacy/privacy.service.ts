import { Injectable } from '@nestjs/common';
import {
  PrivacyRequestStatus,
  VerificationStatus,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePrivacyRequestDto } from './dto/create-privacy-request.dto';
import { UpdatePrivacyPreferencesDto } from './dto/update-privacy-preferences.dto';

@Injectable()
export class PrivacyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  getPolicySummary() {
    return {
      version: this.configService.get<string>(
        'PRIVACY_POLICY_VERSION',
        '2026-03-27',
      ),
      contactEmail: this.configService.get<string>(
        'PRIVACY_CONTACT_EMAIL',
        'privacidade@triluga.local',
      ),
      sections: [
        {
          title: 'Dados coletados',
          summary:
            'Cadastro, autenticação, perfil, anúncios, reservas, suporte, notificações e preferências de privacidade.',
        },
        {
          title: 'Finalidades',
          summary:
            'Operar o marketplace, cumprir obrigações regulatórias, prevenir fraude, atender suporte e executar reservas.',
        },
        {
          title: 'Direitos do titular',
          summary:
            'Acesso, correção, anonimização, portabilidade, eliminação, restrição, oposição e revogação de consentimento quando aplicável.',
        },
      ],
    };
  }

  async getMyPrivacyCenter(userId: string) {
    const [user, requests] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          analyticsConsentGranted: true,
          analyticsConsentUpdatedAt: true,
        },
      }),
      this.prisma.privacyRequest.findMany({
        where: { userId },
        orderBy: {
          createdAt: 'desc',
        },
        take: 20,
      }),
    ]);

    return {
      policy: this.getPolicySummary(),
      preferences: {
        analyticsConsentGranted: user.analyticsConsentGranted,
        analyticsConsentUpdatedAt: user.analyticsConsentUpdatedAt,
      },
      requests,
    };
  }

  async updateMyPreferences(
    userId: string,
    dto: UpdatePrivacyPreferencesDto,
  ) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        analyticsConsentGranted: dto.analyticsConsentGranted,
        analyticsConsentUpdatedAt: new Date(),
      },
      select: {
        analyticsConsentGranted: true,
        analyticsConsentUpdatedAt: true,
      },
    });

    return {
      analyticsConsentGranted: user.analyticsConsentGranted,
      analyticsConsentUpdatedAt: user.analyticsConsentUpdatedAt,
    };
  }

  async createRequest(userId: string, dto: CreatePrivacyRequestDto) {
    return this.prisma.privacyRequest.create({
      data: {
        userId,
        type: dto.type,
        notes: dto.notes?.trim() || null,
      },
    });
  }

  async listMyRequests(userId: string) {
    return this.prisma.privacyRequest.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async exportMyData(userId: string) {
    const [
      user,
      ownedVehicles,
      renterBookings,
      ownerBookings,
      notifications,
      favorites,
      searchAlerts,
      reviewsWritten,
      reviewsReceived,
      privacyRequests,
      supportConversations,
    ] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        include: {
          profile: true,
        },
      }),
      this.prisma.vehicle.findMany({
        where: { ownerId: userId },
        include: {
          images: {
            orderBy: { position: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.booking.findMany({
        where: { renterId: userId },
        include: {
          vehicle: true,
          payment: true,
          review: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.booking.findMany({
        where: { ownerId: userId },
        include: {
          vehicle: true,
          payment: true,
          review: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.favorite.findMany({
        where: { userId },
        include: {
          vehicle: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.searchAlert.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.findMany({
        where: { authorId: userId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.findMany({
        where: { ownerId: userId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.privacyRequest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.supportConversation.findMany({
        where: { userId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      policy: this.getPolicySummary(),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt,
        analyticsConsentGranted: user.analyticsConsentGranted,
        analyticsConsentUpdatedAt: user.analyticsConsentUpdatedAt,
        profile: user.profile
          ? {
              fullName: user.profile.fullName,
              phone: user.profile.phone,
              city: user.profile.city,
              state: user.profile.state,
              bio: user.profile.bio,
              avatarUrl: user.profile.avatarUrl,
              documentNumber: user.profile.documentNumber,
              driverLicenseNumber: user.profile.driverLicenseNumber,
              hasDocumentImage: !!user.profile.documentImageUrl,
              hasDriverLicenseImage: !!user.profile.driverLicenseImageUrl,
              documentVerificationStatus:
                user.profile.documentVerificationStatus ??
                VerificationStatus.NOT_SUBMITTED,
              driverLicenseVerification:
                user.profile.driverLicenseVerification ??
                VerificationStatus.NOT_SUBMITTED,
            }
          : null,
      },
      ownedVehicles,
      renterBookings,
      ownerBookings,
      notifications,
      favorites,
      searchAlerts,
      reviewsWritten,
      reviewsReceived,
      privacyRequests,
      supportConversations,
    };
  }

  async getAdminRequests() {
    return this.prisma.privacyRequest.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            profile: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });
  }

  async updateRequestStatus(params: {
    requestId: string;
    status: PrivacyRequestStatus;
    resolutionNotes?: string;
  }) {
    return this.prisma.privacyRequest.update({
      where: { id: params.requestId },
      data: {
        status: params.status,
        resolutionNotes: params.resolutionNotes?.trim() || null,
        completedAt:
          params.status === PrivacyRequestStatus.COMPLETED
            ? new Date()
            : null,
      },
    });
  }
}
