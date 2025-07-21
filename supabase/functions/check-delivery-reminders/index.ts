// =============================================================================
// SUPABASE EDGE FUNCTION: check-delivery-reminders
// =============================================================================
// This function runs daily to check for orders due in 7 days, 3 days, and today
// Deploy with: supabase functions deploy check-delivery-reminders
// Schedule with: supabase functions schedule check-delivery-reminders "0 9 * * *" (daily at 9 AM)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeliveryReminder {
  orderId: string;
  orderType: 'simple' | 'bulk';
  orderName: string;
  clientName?: string;
  deliveryDate: string;
  daysUntilDelivery: number;
  userId: string;
}

interface PushMessage {
  to: string;
  sound: string;
  title: string;
  body: string;
  data?: any;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
}

interface PushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
}

const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get current date and calculate target dates
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);
    const sevenDaysStr = sevenDaysFromNow.toISOString().split('T')[0];
    
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);
    const threeDaysStr = threeDaysFromNow.toISOString().split('T')[0];

    console.log(`Checking delivery reminders for dates: ${todayStr}, ${threeDaysStr}, ${sevenDaysStr}`);

    // Get all users with active push tokens
    const { data: activeUsers, error: usersError } = await supabaseClient
      .from('push_tokens')
      .select('user_id')
      .eq('is_active', true);

    if (usersError) {
      console.error('Error fetching active users:', usersError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch active users' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!activeUsers || activeUsers.length === 0) {
      console.log('No active users found');
      return new Response(
        JSON.stringify({ message: 'No active users found' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const userIds = [...new Set(activeUsers.map(u => u.user_id))];
    console.log(`Processing ${userIds.length} active users`);

    let totalReminders = 0;
    let totalNotificationsSent = 0;

    // Process each user
    for (const userId of userIds) {
      try {
        const userReminders = await checkUserDeliveryReminders(supabaseClient, userId, {
          todayStr,
          threeDaysStr,
          sevenDaysStr,
        });

        if (userReminders.length > 0) {
          const notificationsSent = await sendUserDeliveryNotifications(
            supabaseClient,
            userId,
            userReminders
          );
          
          totalReminders += userReminders.length;
          totalNotificationsSent += notificationsSent;
        }
      } catch (error) {
        console.error(`Error processing user ${userId}:`, error);
        // Continue with other users
      }
    }

    console.log(`Delivery reminder check completed: ${totalReminders} reminders, ${totalNotificationsSent} notifications sent`);

    return new Response(
      JSON.stringify({
        message: 'Delivery reminder check completed',
        totalReminders,
        totalNotificationsSent,
        processedUsers: userIds.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in delivery reminder function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Check delivery reminders for a specific user
 */
async function checkUserDeliveryReminders(
  supabaseClient: any,
  userId: string,
  dates: { todayStr: string; threeDaysStr: string; sevenDaysStr: string }
): Promise<DeliveryReminder[]> {
  const reminders: DeliveryReminder[] = [];

  // Check simple orders
  const { data: simpleOrders, error: simpleError } = await supabaseClient
    .from('orders')
    .select(`
      id,
      order_name,
      date_delivery,
      clients!inner(full_name)
    `)
    .eq('user_id', userId)
    .in('date_delivery', [dates.todayStr, dates.threeDaysStr, dates.sevenDaysStr])
    .not('status', 'eq', 'delivered');

  if (simpleError) {
    console.error(`Error fetching simple orders for user ${userId}:`, simpleError);
  } else if (simpleOrders) {
    simpleOrders.forEach(order => {
      const daysUntilDelivery = calculateDaysUntilDelivery(order.date_delivery);
      if (daysUntilDelivery <= 7) {
        reminders.push({
          orderId: order.id,
          orderType: 'simple',
          orderName: order.order_name,
          clientName: (order.clients as any)?.full_name,
          deliveryDate: order.date_delivery,
          daysUntilDelivery,
          userId,
        });
      }
    });
  }

  // Check bulk orders
  const { data: bulkOrders, error: bulkError } = await supabaseClient
    .from('bulk_orders')
    .select('id, order_name, date_delivery')
    .eq('user_id', userId)
    .in('date_delivery', [dates.todayStr, dates.threeDaysStr, dates.sevenDaysStr])
    .not('status', 'eq', 'delivered');

  if (bulkError) {
    console.error(`Error fetching bulk orders for user ${userId}:`, bulkError);
  } else if (bulkOrders) {
    bulkOrders.forEach(order => {
      const daysUntilDelivery = calculateDaysUntilDelivery(order.date_delivery);
      if (daysUntilDelivery <= 7) {
        reminders.push({
          orderId: order.id,
          orderType: 'bulk',
          orderName: order.order_name,
          deliveryDate: order.date_delivery,
          daysUntilDelivery,
          userId,
        });
      }
    });
  }

  return reminders;
}

/**
 * Send delivery notifications for a specific user
 */
async function sendUserDeliveryNotifications(
  supabaseClient: any,
  userId: string,
  reminders: DeliveryReminder[]
): Promise<number> {
  // Get user's push tokens
  const { data: pushTokens, error: tokensError } = await supabaseClient
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (tokensError || !pushTokens || pushTokens.length === 0) {
    console.log(`No active push tokens for user ${userId}`);
    return 0;
  }

  // Group reminders by notification type
  const todayReminders = reminders.filter(r => r.daysUntilDelivery === 0);
  const threeDayReminders = reminders.filter(r => r.daysUntilDelivery === 3);
  const sevenDayReminders = reminders.filter(r => r.daysUntilDelivery === 7);

  let notificationsSent = 0;

  // Send notifications for each type
  if (todayReminders.length > 0) {
    await sendNotificationForReminders(supabaseClient, userId, pushTokens, todayReminders, 'today');
    notificationsSent++;
  }

  if (threeDayReminders.length > 0) {
    await sendNotificationForReminders(supabaseClient, userId, pushTokens, threeDayReminders, '3days');
    notificationsSent++;
  }

  if (sevenDayReminders.length > 0) {
    await sendNotificationForReminders(supabaseClient, userId, pushTokens, sevenDayReminders, '7days');
    notificationsSent++;
  }

  // Log the notifications sent
  await logDeliveryNotifications(supabaseClient, reminders);

  return notificationsSent;
}

/**
 * Send a single notification for a group of reminders
 */
async function sendNotificationForReminders(
  supabaseClient: any,
  userId: string,
  pushTokens: any[],
  reminders: DeliveryReminder[],
  notificationType: '7days' | '3days' | 'today'
): Promise<void> {
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

  const messages: PushMessage[] = pushTokens.map(tokenData => ({
    to: tokenData.token,
    sound: 'default',
    title,
    body,
    data: {
      screen: 'Home',
      notificationType: 'delivery_reminder',
      reminderType: notificationType,
      orderCount,
      orderIds: reminders.map(r => r.orderId),
    },
    channelId: 'reminders',
    priority: 'high',
  }));

  try {
    const response = await fetch(EXPO_PUSH_API_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Expo Push API error for user ${userId}:`, errorText);
      return;
    }

    const tickets: PushTicket[] = await response.json();
    const successCount = tickets.filter(ticket => ticket.status === 'ok').length;
    
    console.log(`Sent ${notificationType} notification to user ${userId}: ${successCount}/${messages.length} successful`);
  } catch (error) {
    console.error(`Error sending ${notificationType} notification to user ${userId}:`, error);
  }
}

/**
 * Log delivery notifications in the database
 */
async function logDeliveryNotifications(
  supabaseClient: any,
  reminders: DeliveryReminder[]
): Promise<void> {
  try {
    const notificationsToLog = reminders.map(reminder => ({
      user_id: reminder.userId,
      order_id: reminder.orderId,
      order_type: reminder.orderType,
      order_name: reminder.orderName,
      client_name: reminder.clientName,
      delivery_date: reminder.deliveryDate,
      notification_type: getNotificationType(reminder.daysUntilDelivery),
      sent_at: new Date().toISOString(),
      status: 'sent',
    }));

    const { error } = await supabaseClient
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
function calculateDaysUntilDelivery(deliveryDate: string): number {
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
function getNotificationType(daysUntilDelivery: number): '7days' | '3days' | 'today' {
  if (daysUntilDelivery === 0) return 'today';
  if (daysUntilDelivery === 3) return '3days';
  if (daysUntilDelivery === 7) return '7days';
  return '7days'; // fallback
} 