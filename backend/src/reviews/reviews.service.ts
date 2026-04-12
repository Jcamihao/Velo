import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateUserReviewDto } from './dto/create-user-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(authorId: string, dto: CreateReviewDto) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: dto.vehicleId,
        isActive: true,
      },
      include: {
        owner: true,
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado.');
    }

    if (vehicle.ownerId === authorId) {
      throw new ForbiddenException(
        'Você não pode avaliar o próprio anúncio.',
      );
    }

    const existingReview = await this.prisma.review.findFirst({
      where: {
        vehicleId: vehicle.id,
        authorId,
      },
    });

    if (existingReview) {
      throw new BadRequestException('Você já avaliou este anúncio.');
    }

    const review = await this.prisma.review.create({
      data: {
        vehicleId: vehicle.id,
        authorId,
        ownerId: vehicle.ownerId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });

    const aggregate = await this.prisma.review.aggregate({
      where: { vehicleId: vehicle.id },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await this.prisma.vehicle.update({
      where: { id: vehicle.id },
      data: {
        ratingAverage: Number((aggregate._avg.rating ?? 0).toFixed(2)),
        reviewsCount: aggregate._count.rating,
      },
    });

    await this.notificationsService.create({
      userId: vehicle.ownerId,
      type: NotificationType.REVIEW_CREATED,
      title: 'Nova avaliação recebida',
      message: `Seu anúncio recebeu nota ${dto.rating}.`,
      metadata: { vehicleId: vehicle.id, reviewId: review.id },
    });

    return review;
  }

  async createUserReview(authorId: string, dto: CreateUserReviewDto) {
    if (dto.targetUserId === authorId) {
      throw new ForbiddenException('Você não pode avaliar o próprio perfil.');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: {
        id: dto.targetUserId,
      },
    });

    if (!targetUser) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    const existingReview = await this.prisma.userReview.findFirst({
      where: {
        authorId,
        targetUserId: targetUser.id,
      },
    });

    if (existingReview) {
      throw new BadRequestException('Você já avaliou este usuário.');
    }

    const userReview = await this.prisma.userReview.create({
      data: {
        authorId,
        targetUserId: targetUser.id,
        rating: dto.rating,
        comment: dto.comment,
      },
    });

    await this.notificationsService.create({
      userId: targetUser.id,
      type: NotificationType.REVIEW_CREATED,
      title: 'Nova avaliação no seu perfil',
      message: `Seu perfil recebeu nota ${dto.rating}.`,
      metadata: { userReviewId: userReview.id },
    });

    return userReview;
  }

  async listByVehicle(vehicleId: string) {
    return this.prisma.review.findMany({
      where: { vehicleId },
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
    });
  }

}
