import { supabase } from '../../supabaseConfig';
import { NotificationData } from './notificationService';

export interface DeliveryNotification {
  id: string;
  userId: string;
  orderId: string;
  orderType: 'simple' | 'bulk';
  orderName: string;
  clientName?: string;
  deliveryDate: string;
  notificationType: '7days' | '3days' | 'today';
  sentAt: string;
  status: 'pending' | 'sent' | 'failed';
}

export interface DeliveryReminder {
  orderId: string;
  orderType: 'simple' | 'bulk';
  orderName: string;
  clientName?: string;
  deliveryDate: string;
  daysUntilDelivery: number;
}

class DeliveryNotificationService {
  /**
   * Check for orders due in 7 days, 3 days, and today
   * This should be called daily (can be scheduled via cron job or app background task)
   */
  async checkDeliveryReminders(userId: string): Promise<DeliveryReminder[]> {
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // Calculate target dates
      const sevenDaysFromNow = new Date(today);
      sevenDaysFromNow.setDate(today.getDate() + 7);
      const sevenDaysStr = sevenDaysFromNow.toISOString().split('T')[0];
      
      const threeDaysFromNow = new Date(today);
      threeDaysFromNow.setDate(today.getDate() + 3);
      const threeDaysStr = threeDaysFromNow.toISOString().split('T')[0];

      const reminders: DeliveryReminder[] = [];

      // Check simple orders
      const { data: simpleOrders, error: simpleError } = await supabase
        .from('orders')
        .select(`
          id,
          order_name,
          date_delivery,
          clients!inner(full_name)
        `)
        .eq('user_id', userId)
        .in('date_delivery', [todayStr, threeDaysStr, sevenDaysStr])
        .not('status', 'eq', 'delivered'); // Don't notify for delivered orders

      if (simpleError) {
        console.error('Error fetching simple orders for delivery reminders:', simpleError);
      } else if (simpleOrders) {
        simpleOrders.forEach(order => {
          const daysUntilDelivery = this.calculateDaysUntilDelivery(order.date_delivery);
          if (daysUntilDelivery <= 7) {
            reminders.push({
              orderId: order.id,
              orderType: 'simple',
              orderName: order.order_name,
              clientName: (order.clients as any)?.full_name,
              deliveryDate: order.date_delivery,
              daysUntilDelivery,
            });
          }
        });
      }

      // Check bulk orders
      const { data: bulkOrders, error: bulkError } = await supabase
        .from('bulk_orders')
        .select('id, order_name, date_delivery')
        .eq('user_id', userId)
        .in('date_delivery', [todayStr, threeDaysStr, sevenDaysStr])
        .not('status', 'eq', 'delivered'); // Don't notify for delivered orders

      if (bulkError) {
        console.error('Error fetching bulk orders for delivery reminders:', bulkError);
      } else if (bulkOrders) {
        bulkOrders.forEach(order => {
          const daysUntilDelivery = this.calculateDaysUntilDelivery(order.date_delivery);
          if (daysUntilDelivery <= 7) {
            reminders.push({
              orderId: order.id,
              orderType: 'bulk',
              orderName: order.order_name,
              deliveryDate: order.date_delivery,
              daysUntilDelivery,
            });
          }
        });
      }

      return reminders;
    } catch (error) {
      console.error('Error checking delivery reminders:', error);
      return [];
    }
  }

  /**
   * Send delivery notifications for a specific user
   */
  async sendDeliveryNotifications(userId: string): Promise<void> {
    try {
      const reminders = await this.checkDeliveryReminders(userId);
      
      if (reminders.length === 0) {
        console.log('No delivery reminders to send');
        return;
      }

      // Group reminders by notification type
      const todayReminders = reminders.filter(r => r.daysUntilDelivery === 0);
      const threeDayReminders = reminders.filter(r => r.daysUntilDelivery === 3);
      const sevenDayReminders = reminders.filter(r => r.daysUntilDelivery === 7);

      // Send notifications for each type
      if (todayReminders.length > 0) {
        await this.sendNotificationForReminders(userId, todayReminders, 'today');
      }

      if (threeDayReminders.length > 0) {
        await this.sendNotificationForReminders(userId, threeDayReminders, '3days');
      }

      if (sevenDayReminders.length > 0) {
        await this.sendNotificationForReminders(userId, sevenDayReminders, '7days');
      }

      // Log the notifications sent
      await this.logDeliveryNotifications(userId, reminders);

    } catch (error) {
      console.error('Error sending delivery notifications:', error);
    }
  }

  /**
   * Send a single notification for a group of reminders
   */
  private async sendNotificationForReminders(
    userId: string, 
    reminders: DeliveryReminder[], 
    notificationType: '7days' | '3days' | 'today'
  ): Promise<void> {
    try {
      const { sendPushNotification } = await import('./notificationService');
      
      let title: string;
      let body: string;
      const orderCount = reminders.length;

      switch (notificationType) {
        case '7days':
          title = '📅 Order Reminder';
          body = `You have ${orderCount} order${orderCount > 1 ? 's' : ''} due in 1 week. Tap to view details.`;
          break;
        case '3days':
          title = '⚠️ Order Due Soon';
          body = `You have ${orderCount} order${orderCount > 1 ? 's' : ''} due in 3 days. Tap to view details.`;
          break;
        case 'today':
          title = '🚨 Orders Due Today';
          body = `You have ${orderCount} order${orderCount > 1 ? 's' : ''} due today! Tap to view details.`;
          break;
      }

      const notificationData: NotificationData = {
        title,
        body,
        data: {
          screen: 'Home',
          notificationType: 'delivery_reminder',
          reminderType: notificationType,
          orderCount,
          orderIds: reminders.map(r => r.orderId),
        },
      };

      await sendPushNotification([userId], notificationData);
      console.log(`Sent ${notificationType} notification for ${orderCount} orders`);

    } catch (error) {
      console.error(`Error sending ${notificationType} notification:`, error);
    }
  }

  /**
   * Log delivery notifications in the database
   */
  private async logDeliveryNotifications(userId: string, reminders: DeliveryReminder[]): Promise<void> {
    try {
      const notificationsToLog = reminders.map(reminder => ({
        user_id: userId,
        order_id: reminder.orderId,
        order_type: reminder.orderType,
        order_name: reminder.orderName,
        client_name: reminder.clientName,
        delivery_date: reminder.deliveryDate,
        notification_type: this.getNotificationType(reminder.daysUntilDelivery),
        sent_at: new Date().toISOString(),
        status: 'sent',
      }));

      const { error } = await supabase
        .from('delivery_notifications')
        .insert(notificationsToLog);

      if (error) {
        console.error('Error logging delivery notifications:', error);
      }
    } catch (error) {
      console.error('Error logging delivery notifications:', error);
    }
  }

  /**
   * Calculate days until delivery
   */
  private calculateDaysUntilDelivery(deliveryDate: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const delivery = new Date(deliveryDate);
    delivery.setHours(0, 0, 0, 0);
    
    const diffTime = delivery.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  /**
   * Get notification type based on days until delivery
   */
  private getNotificationType(daysUntilDelivery: number): '7days' | '3days' | 'today' {
    if (daysUntilDelivery === 0) return 'today';
    if (daysUntilDelivery === 3) return '3days';
    if (daysUntilDelivery === 7) return '7days';
    return '7days'; // fallback
  }

  /**
   * Get delivery notification history for a user
   */
  async getDeliveryNotificationHistory(userId: string): Promise<DeliveryNotification[]> {
    try {
      const { data, error } = await supabase
        .from('delivery_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('sent_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching delivery notification history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching delivery notification history:', error);
      return [];
    }
  }

  /**
   * Check if a notification has already been sent for a specific order and type
   */
  async hasNotificationBeenSent(
    userId: string, 
    orderId: string, 
    notificationType: '7days' | '3days' | 'today'
  ): Promise<boolean> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('delivery_notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('order_id', orderId)
        .eq('notification_type', notificationType)
        .gte('sent_at', today)
        .limit(1);

      if (error) {
        console.error('Error checking notification history:', error);
        return false;
      }

      return (data && data.length > 0);
    } catch (error) {
      console.error('Error checking notification history:', error);
      return false;
    }
  }

  /**
   * Manually trigger delivery notification check (for testing or manual execution)
   */
  async manualDeliveryCheck(userId: string): Promise<{
    reminders: DeliveryReminder[];
    notificationsSent: number;
  }> {
    try {
      const reminders = await this.checkDeliveryReminders(userId);
      
      if (reminders.length > 0) {
        await this.sendDeliveryNotifications(userId);
      }

      return {
        reminders,
        notificationsSent: reminders.length,
      };
    } catch (error) {
      console.error('Error in manual delivery check:', error);
      return {
        reminders: [],
        notificationsSent: 0,
      };
    }
  }
}

export const deliveryNotificationService = new DeliveryNotificationService(); 