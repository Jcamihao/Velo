import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsController } from './payments.controller';
import { MockPaymentGateway } from './gateways/mock-payment.gateway';
import { PaymentsService } from './payments.service';

@Module({
  imports: [NotificationsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, MockPaymentGateway],
  exports: [PaymentsService],
})
export class PaymentsModule {}
