import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, NotificationType } from '@prisma/client';
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

  async create(renterId: string, dto: CreateReviewDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: {
        review: true,
        vehicle: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Reserva não encontrada.');
    }

    if (booking.renterId !== renterId) {
      throw new ForbiddenException(
        'Apenas o locatário da reserva pode avaliar a locação.',
      );
    }

    if (booking.review) {
      throw new BadRequestException('Esta reserva já possui avaliação.');
    }

    await this.ensureBookingCompletedForReview({
      bookingId: booking.id,
      status: booking.status,
      endDate: booking.endDate,
    });

    const review = await this.prisma.review.create({
      data: {
        bookingId: booking.id,
        vehicleId: booking.vehicleId,
        authorId: renterId,
        ownerId: booking.ownerId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });

    const aggregate = await this.prisma.review.aggregate({
      where: { vehicleId: booking.vehicleId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await this.prisma.vehicle.update({
      where: { id: booking.vehicleId },
      data: {
        ratingAverage: Number((aggregate._avg.rating ?? 0).toFixed(2)),
        reviewsCount: aggregate._count.rating,
      },
    });

    await this.notificationsService.create({
      userId: booking.ownerId,
      type: NotificationType.REVIEW_CREATED,
      title: 'Nova avaliação recebida',
      message: `Seu anúncio recebeu nota ${dto.rating}.`,
      metadata: { bookingId: booking.id, reviewId: review.id },
    });

    return review;
  }

  async createUserReview(renterId: string, dto: CreateUserReviewDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: {
        userReview: true,
        vehicle: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Reserva não encontrada.');
    }

    if (booking.renterId !== renterId) {
      throw new ForbiddenException(
        'Apenas o locatário da reserva pode avaliar o anunciante.',
      );
    }

    if (booking.userReview) {
      throw new BadRequestException(
        'Esta reserva já possui avaliação do usuário.',
      );
    }

    await this.ensureBookingCompletedForReview({
      bookingId: booking.id,
      status: booking.status,
      endDate: booking.endDate,
    });

    const userReview = await this.prisma.userReview.create({
      data: {
        bookingId: booking.id,
        authorId: renterId,
        targetUserId: booking.ownerId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });

    await this.notificationsService.create({
      userId: booking.ownerId,
      type: NotificationType.REVIEW_CREATED,
      title: 'Nova avaliação no seu perfil',
      message: `Seu perfil recebeu nota ${dto.rating}.`,
      metadata: { bookingId: booking.id, userReviewId: userReview.id },
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

  private async ensureBookingCompletedForReview(params: {
    bookingId: string;
    status: BookingStatus;
    endDate: Date;
  }) {
    let effectiveStatus = params.status;
    const now = new Date();

    if (
      (params.status === BookingStatus.APPROVED ||
        params.status === BookingStatus.IN_PROGRESS) &&
      params.endDate < now
    ) {
      await this.prisma.booking.update({
        where: { id: params.bookingId },
        data: {
          status: BookingStatus.COMPLETED,
          completedAt: now,
        },
      });
      effectiveStatus = BookingStatus.COMPLETED;
    }

    if (effectiveStatus !== BookingStatus.COMPLETED) {
      throw new BadRequestException(
        'A avaliação só pode ser enviada após a conclusão da locação.',
      );
    }
  }
}
