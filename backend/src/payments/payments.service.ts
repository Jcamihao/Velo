import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, NotificationType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { MockPaymentGateway } from './gateways/mock-payment.gateway';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mockPaymentGateway: MockPaymentGateway,
    private readonly notificationsService: NotificationsService,
  ) {}

  async checkout(userId: string, dto: CreateCheckoutDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: {
        payment: true,
        vehicle: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Reserva não encontrada.');
    }

    if (booking.renterId !== userId) {
      throw new ForbiddenException('Apenas o locatário pode iniciar o checkout.');
    }

    if (
      booking.status === BookingStatus.REJECTED ||
      booking.status === BookingStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Não é possível pagar uma reserva cancelada ou recusada.',
      );
    }

    if (booking.status === BookingStatus.PENDING) {
      throw new BadRequestException(
        'Espere a aprovação do proprietário para seguir com o pagamento.',
      );
    }

    if (booking.payment && booking.payment.status === 'PAID') {
      return booking.payment;
    }

    const gatewayResult = await this.mockPaymentGateway.checkout({
      bookingId: booking.id,
      amount: Number(booking.totalAmount),
      method: dto.method,
    });

    const payment = await this.prisma.payment.upsert({
      where: {
        bookingId: booking.id,
      },
      update: {
        amount: booking.totalAmount,
        platformFee: booking.platformFee,
        ownerAmount: booking.subtotal,
        status: gatewayResult.status,
        method: dto.method,
        transactionId: gatewayResult.transactionId,
        checkoutReference: gatewayResult.checkoutReference,
        metadata: gatewayResult.metadata,
        paidAt: gatewayResult.status === 'PAID' ? new Date() : null,
      },
      create: {
        bookingId: booking.id,
        amount: booking.totalAmount,
        platformFee: booking.platformFee,
        ownerAmount: booking.subtotal,
        status: gatewayResult.status,
        method: dto.method,
        transactionId: gatewayResult.transactionId,
        checkoutReference: gatewayResult.checkoutReference,
        metadata: gatewayResult.metadata,
        paidAt: gatewayResult.status === 'PAID' ? new Date() : null,
      },
    });

    await this.notificationsService.create({
      userId: booking.ownerId,
      type: NotificationType.PAYMENT_UPDATE,
      title: 'Pagamento registrado',
      message: `O pagamento da reserva ${booking.id} foi confirmado.`,
      metadata: { bookingId: booking.id, paymentId: payment.id },
    });

    return {
      ...payment,
      amount: Number(payment.amount),
      platformFee: Number(payment.platformFee),
      ownerAmount: Number(payment.ownerAmount),
    };
  }
}
