// =============================================================================
// SUPABASE EDGE FUNCTION: send-push-notification
// =============================================================================
// This file should be placed in: supabase/functions/send-push-notification/index.ts
// Deploy with: supabase functions deploy send-push-notification

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationData {
  title: string;
  body: string;
  data?: {
    screen?: string;
    orderId?: string;
    clientId?: string;
    [key: string]: any;
  };
}

interface PushNotificationRequest {
  userIds: string[];
  notification: NotificationData;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables')
      return new Response(
        JSON.stringify({ error: 'Missing Supabase configuration' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const { userIds, notification }: PushNotificationRequest = await req.json()
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'userIds array is required and must not be empty' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!notification || !notification.title || !notification.body) {
      return new Response(
        JSON.stringify({ error: 'notification with title and body is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Sending notification to ${userIds.length} users:`, { userIds, notification })

    // Get push tokens for the specified users
    const { data: tokens, error: tokensError } = await supabase
      .from('push_tokens')
      .select('token, platform')
      .in('user_id', userIds)

    if (tokensError) {
      console.error('Error fetching push tokens:', tokensError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch push tokens' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!tokens || tokens.length === 0) {
      console.log('No push tokens found for users:', userIds)
      return new Response(
        JSON.stringify({ message: 'No push tokens found for specified users' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Found ${tokens.length} push tokens`)

    // Send push notifications
    const fcmTokens = tokens.map(t => t.token).filter(token => 
      token && token.length > 0 && !token.startsWith('ExponentPushToken[')
    )

    if (fcmTokens.length === 0) {
      console.log('No valid FCM push tokens found')
      return new Response(
        JSON.stringify({ message: 'No valid FCM push tokens found' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Send to Firebase Cloud Messaging using Server Key
    const serverKey = Deno.env.get('FIREBASE_SERVER_KEY')
    if (!serverKey) {
      console.error('Firebase Server Key not configured')
      return new Response(
        JSON.stringify({ error: 'Firebase Server Key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Send to Firebase Cloud Messaging
    const firebaseResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${serverKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        registration_ids: fcmTokens,
        notification: {
          title: notification.title,
          body: notification.body,
          sound: 'default',
        },
        data: notification.data || {},
        priority: 'high',
      }),
    })

    if (!firebaseResponse.ok) {
      const errorText = await firebaseResponse.text()
      console.error('Firebase push service error:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to send push notification via Firebase' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const firebaseResult = await firebaseResponse.json()
    console.log('Firebase push service response:', firebaseResult)

    // Check for errors in Firebase response
    const errors = firebaseResult.results?.filter((result: any) => result.error) || []
    if (errors.length > 0) {
      console.error('Some push notifications failed:', errors)
    }

    const successCount = firebaseResult.success || 0

    return new Response(
      JSON.stringify({ 
        message: `Push notifications sent successfully`,
        sent: successCount,
        total: fcmTokens.length,
        errors: errors.length
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 