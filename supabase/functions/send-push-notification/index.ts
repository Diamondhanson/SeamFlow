// =============================================================================
// SUPABASE EDGE FUNCTION: send-push-notification
// =============================================================================
// This file should be placed in: supabase/functions/send-push-notification/index.ts
// Deploy with: supabase functions deploy send-push-notification

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  userIds: string[];
  notification: {
    title: string;
    body: string;
    data?: {
      screen?: string;
      orderId?: string;
      clientId?: string;
      [key: string]: any;
    };
  };
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
  id: string;
  status: 'ok' | 'error';
  message?: string;
  details?: any;
}

interface PushReceipt {
  id: string;
  status: 'ok' | 'error';
  message?: string;
  details?: any;
}

const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_PUSH_RECEIPT_URL = 'https://exp.host/--/api/v2/push/getReceipts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
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

    // Get user from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: user, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const payload: NotificationPayload = await req.json();
    
    if (!payload.userIds || !payload.notification) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userIds and notification' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get push tokens for specified users
    const { data: pushTokens, error: tokensError } = await supabaseClient
      .from('push_tokens')
      .select('*')
      .in('user_id', payload.userIds)
      .eq('is_active', true);

    if (tokensError) {
      console.error('Error fetching push tokens:', tokensError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch push tokens' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!pushTokens || pushTokens.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No active push tokens found for specified users',
          sentCount: 0 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Prepare push messages
    const messages: PushMessage[] = pushTokens.map(tokenData => ({
      to: tokenData.token,
      sound: 'default',
      title: payload.notification.title,
      body: payload.notification.body,
      data: payload.notification.data || {},
      channelId: getChannelIdFromData(payload.notification.data),
      priority: 'high',
    }));

    console.log(`Sending ${messages.length} push notifications`);

    // Send notifications via Expo Push API
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
      console.error('Expo Push API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to send push notifications' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const tickets: PushTicket[] = await response.json();
    
    // Log notification attempts in database
    const logPromises = tickets.map(async (ticket, index) => {
      const tokenData = pushTokens[index];
      
      return supabaseClient
        .from('notification_logs')
        .insert({
          user_id: tokenData.user_id,
          title: payload.notification.title,
          body: payload.notification.body,
          data: payload.notification.data,
          status: ticket.status === 'ok' ? 'sent' : 'failed',
          error_message: ticket.message,
          push_token_id: tokenData.id,
        });
    });

    await Promise.all(logPromises);

    // Count successful sends
    const successCount = tickets.filter(ticket => ticket.status === 'ok').length;
    const errorCount = tickets.filter(ticket => ticket.status === 'error').length;

    console.log(`Push notifications sent: ${successCount} success, ${errorCount} errors`);

    // Process receipts for successful tickets (async)
    const successfulTickets = tickets.filter(ticket => ticket.status === 'ok' && ticket.id);
    if (successfulTickets.length > 0) {
      // Process receipts in background (don't wait for response)
      processReceipts(supabaseClient, successfulTickets.map(t => t.id));
    }

    return new Response(
      JSON.stringify({
        message: 'Push notifications processed',
        sentCount: successCount,
        errorCount: errorCount,
        totalTokens: pushTokens.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in push notification function:', error);
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
 * Determine the notification channel based on data
 */
function getChannelIdFromData(data?: any): string {
  if (!data) return 'default';
  
  if (data.orderId) return 'orders';
  if (data.screen === 'Calendar') return 'reminders';
  if (data.clientId) return 'orders';
  
  return 'default';
}

/**
 * Process push notification receipts (async)
 */
async function processReceipts(supabaseClient: any, ticketIds: string[]) {
  if (ticketIds.length === 0) return;

  try {
    // Wait a bit before checking receipts (Expo recommendation)
    await new Promise(resolve => setTimeout(resolve, 1000));

    const receiptResponse = await fetch(EXPO_PUSH_RECEIPT_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ids: ticketIds,
      }),
    });

    if (!receiptResponse.ok) {
      console.error('Failed to fetch push receipts');
      return;
    }

    const receipts: { [key: string]: PushReceipt } = await receiptResponse.json();
    
    // Update notification logs with receipt information
    const updatePromises = Object.entries(receipts).map(async ([ticketId, receipt]) => {
      const status = receipt.status === 'ok' ? 'delivered' : 'failed';
      
      return supabaseClient
        .from('notification_logs')
        .update({
          status: status,
          error_message: receipt.message,
        })
        .eq('id', ticketId); // This assumes we store ticket ID, you might need to adjust
    });

    await Promise.all(updatePromises);
    console.log(`Updated ${Object.keys(receipts).length} notification receipts`);
    
  } catch (error) {
    console.error('Error processing receipts:', error);
  }
}

// =============================================================================
// DEPLOYMENT INSTRUCTIONS
// =============================================================================

/*
1. Create the function in Supabase:
   supabase functions new send-push-notification

2. Replace the content of supabase/functions/send-push-notification/index.ts with this code

3. Deploy the function:
   supabase functions deploy send-push-notification

4. Set up environment variables in Supabase dashboard:
   - SUPABASE_URL (should be automatically set)
   - SUPABASE_SERVICE_ROLE_KEY (should be automatically set)

5. Test the function:
   curl -X POST 'https://your-project.supabase.co/functions/v1/send-push-notification' \
   -H "Authorization: Bearer YOUR_JWT_TOKEN" \
   -H "Content-Type: application/json" \
   -d '{
     "userIds": ["user-uuid"],
     "notification": {
       "title": "Test Notification",
       "body": "This is a test notification",
       "data": {
         "screen": "Home"
       }
     }
   }'
*/ 