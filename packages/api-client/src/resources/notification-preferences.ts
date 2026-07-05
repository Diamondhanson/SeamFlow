import type { HttpClient } from '../http';
import type {
  NotificationPreferences,
  NotificationPreferencesUpdateInput,
} from '@seamflow/schemas';

export function makeNotificationPreferencesResource(http: HttpClient) {
  return {
    get(): Promise<NotificationPreferences> {
      return http.get<NotificationPreferences>('/me/notification-preferences');
    },
    update(
      input: NotificationPreferencesUpdateInput,
    ): Promise<NotificationPreferences> {
      return http.patch<NotificationPreferences>(
        '/me/notification-preferences',
        input,
      );
    },
  };
}

export type NotificationPreferencesResource = ReturnType<
  typeof makeNotificationPreferencesResource
>;
