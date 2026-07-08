import { pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', [
  'tailor',
  'tailor_staff',
  'client',
  'admin',
]);

export const measurementUnitEnum = pgEnum('measurement_unit', ['cm', 'in']);

export const orderStatusEnum = pgEnum('order_status', [
  'registered',
  'in_progress',
  'testing',
  'on_pause',
  'delivered',
]);

export const groupOrderStatusEnum = pgEnum('group_order_status', [
  'planning',
  'in_progress',
  'completed',
  'cancelled',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'succeeded',
  'failed',
  'refunded',
]);

export const paymentProviderEnum = pgEnum('payment_provider', [
  'stripe',
  'paystack',
  'flutterwave',
  'razorpay',
]);

export const invoiceStatusEnum = pgEnum('invoice_status', ['draft', 'sent']);
