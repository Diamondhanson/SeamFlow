import { Logger } from '@nestjs/common';
import {
  ConsoleOtpProvider,
  UnconfiguredOtpProvider,
  type OtpProvider,
} from './otp-provider';
import { DiditOtpProvider } from './didit-otp-provider';

/**
 * Pick the adapter for this environment. The only place a vendor's name is
 * spoken outside its own file.
 *
 * Adding a provider is this switch, its adapter, and its env vars — nothing
 * else in the codebase learns the name. That is what makes the planned move
 * from Didit to Meta's WhatsApp Cloud API a one-file change: Meta is a
 * 'delivers' provider, Didit is a 'verifies' one, and the service already
 * handles both.
 *
 * Every failure to configure resolves to `UnconfiguredOtpProvider`, which
 * refuses rather than pretends. A verification feature that silently no-ops is
 * worse than one that is visibly off, because the badge it feeds keeps being
 * handed out.
 */
export interface OtpProviderEnv {
  providerId: string | undefined;
  nodeEnv: string;
  diditApiKey?: string;
}

export function resolveOtpProvider(env: OtpProviderEnv): OtpProvider {
  const logger = new Logger('OtpProvider');

  switch (env.providerId) {
    case 'console':
      if (env.nodeEnv === 'production') {
        // Fail closed. See ConsoleOtpProvider's note.
        logger.error('OTP_PROVIDER=console is refused in production.');
        return new UnconfiguredOtpProvider();
      }
      return new ConsoleOtpProvider();

    case 'didit': {
      const apiKey = env.diditApiKey?.trim();
      if (!apiKey) {
        logger.error('OTP_PROVIDER=didit but DIDIT_API_KEY is not set.');
        return new UnconfiguredOtpProvider();
      }
      return new DiditOtpProvider({ apiKey });
    }

    // case 'meta-cloud':
    //   return new MetaCloudOtpProvider({ phoneNumberId, accessToken, template });

    default:
      return new UnconfiguredOtpProvider();
  }
}
