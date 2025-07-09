import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../../supabaseConfig';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface NotificationData {
  title: string;
  body: string;
  data?: {
    screen?: string;
    orderId?: string;
    clientId?: string;
    [key: string]: any;
  };
}

export interface PushToken {
  token: string;
  userId: string;
  deviceId: string;
  platform: string;
  createdAt: Date;
  lastUsed: Date;
}

class NotificationService {
  private pushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;

  /**
   * Register for push notifications and get push token
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      // Always request notification permissions (needed for local notifications too)
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Notification permissions not granted');
        return null;
      }

      // If not a physical device, setup local notifications only
      if (!Device.isDevice) {
        console.warn('Push notifications only work on physical devices. Local notifications enabled.');
        
        // Configure notification channels for local notifications (Android)
        if (Platform.OS === 'android') {
          await this.setupNotificationChannels();
        }
        
        return 'simulator-local-only'; // Return indicator for simulator
      }

      // Get push token for physical devices
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || 'fb6e2ea2-97b6-4829-9e5a-b421d61429d9';
      const pushToken = (await Notifications.getExpoPushTokenAsync({
        projectId
      })).data;

      // Configure notification channels (Android)
      if (Platform.OS === 'android') {
        await this.setupNotificationChannels();
      }

      this.pushToken = pushToken;
      return pushToken;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Setup notification channels (Android)
   */
  private async setupNotificationChannels(): Promise<void> {
    if (Platform.OS !== 'android') return;

    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });

    await Notifications.setNotificationChannelAsync('orders', {
      name: 'Order Updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'notification.wav',
    });

    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  /**
   * Store push token in database
   */
  async storePushToken(userId: string, token: string): Promise<void> {
    try {
      const deviceId = Constants.sessionId || 'unknown';
      const platform = Platform.OS;

      const { error } = await supabase
        .from('push_tokens')
        .upsert({
          user_id: userId,
          token,
          device_id: deviceId,
          platform,
          last_used: new Date().toISOString(),
        }, {
          onConflict: 'user_id,device_id'
        });

      if (error) {
        console.error('Error storing push token:', error);
        throw error;
      }

      console.log('Push token stored successfully');
    } catch (error) {
      console.error('Error storing push token:', error);
      throw error;
    }
  }

  /**
   * Remove push token from database
   */
  async removePushToken(userId: string): Promise<void> {
    try {
      const deviceId = Constants.sessionId || 'unknown';

      const { error } = await supabase
        .from('push_tokens')
        .delete()
        .match({ user_id: userId, device_id: deviceId });

      if (error) {
        console.error('Error removing push token:', error);
        throw error;
      }

      console.log('Push token removed successfully');
    } catch (error) {
      console.error('Error removing push token:', error);
      throw error;
    }
  }

  /**
   * Send a push notification via Supabase Edge Function
   */
  async sendPushNotification(
    userIds: string[],
    notificationData: NotificationData
  ): Promise<void> {
    try {
      // Call Supabase Edge Function to send notification
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          userIds,
          notification: notificationData,
        },
      });

      if (error) {
        console.error('Error sending push notification:', error);
        throw error;
      }

      console.log('Push notification sent successfully');
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }
  }

  /**
   * Send a test notification to current user
   */
  async sendTestNotification(userId: string): Promise<void> {
    try {
      // On simulator, use local notification for testing
      if (!Device.isDevice) {
        const testData: NotificationData = {
          title: '📱 SeamFlow Test',                    // ← CUSTOMIZE: Title
          body: 'Hello! Your notification system is working perfectly! 🎉',  // ← CUSTOMIZE: Message
          data: {
            screen: 'Home',
            testData: 'Simulator test successful',      // ← CUSTOMIZE: Custom data
            timestamp: new Date().toISOString(),       // ← CUSTOMIZE: Add timestamp
          },
        };

        // Schedule immediate local notification
        await this.scheduleLocalNotification(testData, 1); // 1 second delay
        console.log('Local test notification scheduled for simulator');
        return;
      }

      // On physical device, use push notification
      const testData: NotificationData = {
        title: '🚀 SeamFlow Push Test',                 // ← CUSTOMIZE: Title
        body: 'Awesome! Push notifications are working from the server! 💪',  // ← CUSTOMIZE: Message
        data: {
          screen: 'Home',
          testData: 'Push notification successful',     // ← CUSTOMIZE: Custom data
          timestamp: new Date().toISOString(),          // ← CUSTOMIZE: Add timestamp
          source: 'server',                             // ← CUSTOMIZE: Add source info
        },
      };

      await this.sendPushNotification([userId], testData);
    } catch (error) {
      console.error('Error sending test notification:', error);
      throw error;
    }
  }

  /**
   * Setup notification listeners
   */
  setupNotificationListeners(onNotificationReceived?: (notification: any) => void) {
    // Listen for notifications received while app is in foreground
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
        onNotificationReceived?.(notification);
      }
    );

    // Listen for user tapping on notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification response:', response);
        this.handleNotificationResponse(response);
      }
    );
  }

  /**
   * Handle notification tap responses
   */
  private handleNotificationResponse(response: any) {
    const { notification } = response;
    const { data } = notification.request.content;

    if (data?.screen) {
      // Navigate to specific screen
      console.log('Navigate to screen:', data.screen);
      // Add navigation logic here
    }

    if (data?.orderId) {
      // Handle order-related notification
      console.log('Handle order notification:', data.orderId);
      // Add order navigation logic here
    }

    if (data?.clientId) {
      // Handle client-related notification
      console.log('Handle client notification:', data.clientId);
      // Add client navigation logic here
    }
  }

  /**
   * Schedule a local notification
   */
  async scheduleLocalNotification(
    notificationData: NotificationData,
    trigger: Date | number
  ): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notificationData.title,
          body: notificationData.body,
          data: notificationData.data,
          sound: 'notification.wav',
        },
        trigger: typeof trigger === 'number' ? { seconds: trigger } : trigger,
      });

      console.log('Local notification scheduled:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling local notification:', error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelScheduledNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('Scheduled notification canceled:', notificationId);
    } catch (error) {
      console.error('Error canceling scheduled notification:', error);
      throw error;
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllScheduledNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All scheduled notifications canceled');
    } catch (error) {
      console.error('Error canceling all scheduled notifications:', error);
      throw error;
    }
  }

  /**
   * Get notification permissions status
   */
  async getPermissionStatus(): Promise<string> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status;
    } catch (error) {
      console.error('Error getting notification permissions:', error);
      return 'unknown';
    }
  }

  /**
   * Check if device supports push notifications
   */
  isDeviceSupported(): boolean {
    return Device.isDevice;
  }

  /**
   * Get current push token
   */
  getPushToken(): string | null {
    return this.pushToken;
  }

  /**
   * Clean up listeners
   */
  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService; 