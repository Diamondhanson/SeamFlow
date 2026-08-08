import type { HttpClient } from '../http';
import type {
  DeviceTokenRegisterInput,
  NotificationPage,
  NotificationSettings,
  PushTestInput,
} from '@seamflow/schemas';

export interface PushTestResponse {
  /** Number of tokens the server attempted to push to. 0 means nothing happened. */
  sentTo: number;
}

export function makeNotificationsResource(http: HttpClient) {
  return {
    /** Register (or refresh) the device's Expo push token on the current user. */
    registerToken(input: DeviceTokenRegisterInput): Promise<void> {
      return http.post<void>('/me/device-tokens', input);
    },
    /** Drop a token (mobile calls this on sign-out). */
    removeToken(expoToken: string): Promise<void> {
      return http.delete<void>(`/me/device-tokens/${encodeURIComponent(expoToken)}`);
    },
    /** Fire a test push to all this user's registered devices. */
    pushTest(input: PushTestInput = {}): Promise<PushTestResponse> {
      return http.post<PushTestResponse>('/me/push-test', input);
    },

    // ── Inbox ────────────────────────────────────────────────────────────────
    // Role-neutral: the tailor app and the client app call exactly these.

    /** One page of the inbox, newest first. `unreadCount` rides along. */
    list(params: { cursor?: string; limit?: number } = {}): Promise<NotificationPage> {
      const q = new URLSearchParams();
      if (params.cursor) q.set('cursor', params.cursor);
      if (params.limit) q.set('limit', String(params.limit));
      const qs = q.toString();
      return http.get<NotificationPage>(`/notifications${qs ? `?${qs}` : ''}`);
    },

    unreadCount(): Promise<{ count: number }> {
      return http.get<{ count: number }>('/notifications/unread-count');
    },

    /** Mark one read — on tap, never on screen open. */
    markRead(id: string): Promise<{ unreadCount: number }> {
      return http.post<{ unreadCount: number }>(`/notifications/${id}/read`, {});
    },

    markAllRead(): Promise<{ unreadCount: number }> {
      return http.post<{ unreadCount: number }>('/notifications/read-all', {});
    },

    getSettings(): Promise<NotificationSettings> {
      return http.get<NotificationSettings>('/notifications/settings');
    },

    updateSettings(input: NotificationSettings): Promise<NotificationSettings> {
      return http.post<NotificationSettings>('/notifications/settings', input);
    },
  };
}

export type NotificationsResource = ReturnType<typeof makeNotificationsResource>;
