import type { HttpClient } from '../http';
import type { DeviceTokenRegisterInput, PushTestInput } from '@seamflow/schemas';

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
  };
}

export type NotificationsResource = ReturnType<typeof makeNotificationsResource>;
