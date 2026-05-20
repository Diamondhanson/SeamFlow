import { z } from 'zod';

export const DevicePlatformSchema = z.enum(['ios', 'android', 'web']);
export type DevicePlatform = z.infer<typeof DevicePlatformSchema>;

// Expo push tokens look like `ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]`
// (legacy/managed) or `ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx]` (newer).
// We accept both prefixes; Expo's push API is the source of truth on whether
// any given token is deliverable, so we don't try to validate the inner part.
const EXPO_TOKEN_RE = /^(?:Exponent|Expo)PushToken\[[A-Za-z0-9_\-:.]+\]$/;

export const DeviceTokenRegisterSchema = z.object({
  expoToken: z.string().regex(EXPO_TOKEN_RE, 'Not a valid Expo push token'),
  platform: DevicePlatformSchema,
});
export type DeviceTokenRegisterInput = z.infer<typeof DeviceTokenRegisterSchema>;

export const DeviceTokenSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  expoToken: z.string(),
  platform: DevicePlatformSchema,
  lastSeenAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});
export type DeviceToken = z.infer<typeof DeviceTokenSchema>;

/**
 * Test-push DTO — dev-only endpoint POST /me/push-test.
 * Mobile uses this from a "Send test notification" button so the round-trip
 * (mobile registers → backend stores → backend fans out → device receives)
 * can be verified without needing an actual triggering event.
 */
export const PushTestSchema = z
  .object({
    title: z.string().min(1).max(100).optional(),
    body: z.string().min(1).max(500).optional(),
  })
  .strict();
export type PushTestInput = z.infer<typeof PushTestSchema>;
