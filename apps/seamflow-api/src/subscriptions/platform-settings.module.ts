// ============================================================================
// The platform switches, as a module of their own.
//
// PlatformSettingsService started as a subscriptions concern and is now read by
// verification too. It could not simply be imported from SubscriptionsModule,
// because that module imports AdminModule, which imports VerificationModule —
// so the verification side asking for it would have closed a cycle.
//
// Giving the service its own module breaks that: it depends on nothing but the
// database, so anything may import it without dragging a feature module along.
// The file itself stays in subscriptions/ to keep this change small; what makes
// it general is that nothing in here knows about subscriptions.
// ============================================================================

import { Module } from '@nestjs/common';
import { PlatformSettingsService } from './platform-settings.service';

@Module({
  providers: [PlatformSettingsService],
  exports: [PlatformSettingsService],
})
export class PlatformSettingsModule {}
