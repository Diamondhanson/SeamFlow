import { Logger, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NullPaymentProvider, type PaymentProvider } from './payment-provider';
import { FakePaymentProvider } from './fake-payment-provider';
import { FapshiPaymentProvider } from './fapshi-payment-provider';

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

/**
 * Which rail is in use, chosen by SUBSCRIPTION_PAYMENT_PROVIDER.
 *
 * Unset means none, which is the state today: the system runs, the screens
 * work, and checkout answers "not available yet". Adding a real provider is a
 * class implementing PaymentProvider plus one line here — and nothing else in
 * the codebase learns its name.
 */
export const paymentProviderFactory: Provider = {
  provide: PAYMENT_PROVIDER,
  inject: [ConfigService],
  useFactory: (config: ConfigService): PaymentProvider => {
    const logger = new Logger('PaymentProvider');
    const choice = (config.get<string>('SUBSCRIPTION_PAYMENT_PROVIDER') ?? '').trim();
    const nodeEnv = config.get<string>('NODE_ENV') ?? 'development';

    switch (choice) {
      case 'fake':
        logger.warn('Using the FAKE payment provider — development and tests only');
        return new FakePaymentProvider(nodeEnv);
      case 'fapshi': {
        const provider = new FapshiPaymentProvider(config);
        const env = config.get<string>('FAPSHI_ENV') === 'live' ? 'LIVE' : 'sandbox';
        if (!provider.isConfigured()) {
          logger.error('SUBSCRIPTION_PAYMENT_PROVIDER=fapshi but FAPSHI_API_USER/KEY are missing');
        } else {
          logger.log(`Payments: Fapshi (${env})`);
        }
        return provider;
      }
      // case 'flutterwave': return new FlutterwaveProvider(config);
      case '':
        return new NullPaymentProvider();
      default:
        logger.error(`Unknown SUBSCRIPTION_PAYMENT_PROVIDER "${choice}" — falling back to none`);
        return new NullPaymentProvider();
    }
  },
};
