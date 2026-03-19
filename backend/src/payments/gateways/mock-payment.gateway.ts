import { Injectable } from '@nestjs/common';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MockPaymentGateway {
  async checkout(input: {
    bookingId: string;
    amount: number;
    method: PaymentMethod;
  }) {
    return {
      status: PaymentStatus.PAID,
      transactionId: `mock_tx_${uuidv4()}`,
      checkoutReference: `mock_ref_${uuidv4()}`,
      metadata: {
        provider: 'mock',
        bookingId: input.bookingId,
        amount: input.amount,
        method: input.method,
      },
    };
  }
}
