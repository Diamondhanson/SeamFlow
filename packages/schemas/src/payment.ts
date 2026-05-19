import { z } from 'zod';

export const PaymentStatusSchema = z.enum(['pending', 'succeeded', 'failed', 'refunded']);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

export const PaymentProviderSchema = z.enum(['stripe', 'paystack', 'flutterwave', 'razorpay']);
export type PaymentProvider = z.infer<typeof PaymentProviderSchema>;

export const PaymentSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  amount: z.string(),
  currency: z.string().length(3),
  status: PaymentStatusSchema,
  provider: PaymentProviderSchema,
  providerPaymentId: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Payment = z.infer<typeof PaymentSchema>;
