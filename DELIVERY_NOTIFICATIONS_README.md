# 🚨 Delivery Notification System

A comprehensive notification system that automatically tracks delivery dates and sends push notifications to users about upcoming order deliveries.

## 📋 Features

- **Automatic Delivery Tracking**: Monitors orders due in 7 days, 3 days, and on the delivery date
- **Push Notifications**: Sends notifications even when the app is not running
- **Smart Filtering**: Only notifies for active orders (not delivered)
- **Comprehensive Logging**: Tracks all notification attempts and delivery status
- **Manual Testing**: Built-in testing functionality for development and debugging

## 🏗️ Architecture

### Components

1. **Database Table**: `delivery_notifications` - Stores notification history
2. **Edge Function**: `check-delivery-reminders` - Runs daily to check and send notifications
3. **Client Service**: `deliveryNotificationService` - Handles client-side notification logic
4. **App Integration**: Integrated into AppContext for easy access throughout the app

### Notification Schedule

- **7 Days Before**: "📅 Order Reminder" - You have X order(s) due in 1 week
- **3 Days Before**: "⚠️ Order Due Soon" - You have X order(s) due in 3 days  
- **On Delivery Date**: "🚨 Orders Due Today" - You have X order(s) due today!

## 🚀 Quick Start

### 1. Deploy the System

```bash
# Run the deployment script
./scripts/deploy-delivery-notifications.sh
```

This will:
- Apply database migrations
- Deploy the edge function
- Schedule daily execution at 9 AM
- Verify the deployment

### 2. Test the System

#### In the App
1. Go to the Home screen
2. Scroll to the "Developer Testing" section
3. Tap "Test Delivery Notifications"

#### Manual Testing
```bash
# Test the edge function directly
curl -X POST https://your-project.supabase.co/functions/v1/check-delivery-reminders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### 3. Create Test Orders

Create orders with delivery dates:
- **Today**: For immediate testing
- **3 days from now**: For 3-day reminder testing
- **7 days from now**: For 7-day reminder testing

## 📊 Database Schema

### delivery_notifications Table

```sql
CREATE TABLE delivery_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('simple', 'bulk')),
  order_name TEXT NOT NULL,
  client_name TEXT,
  delivery_date DATE NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('7days', '3days', 'today')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔧 Configuration

### Edge Function Schedule

The edge function runs daily at 9 AM by default. To change the schedule:

```bash
# Remove existing schedule
supabase functions schedule check-delivery-reminders --delete

# Set new schedule (example: every 6 hours)
supabase functions schedule check-delivery-reminders "0 */6 * * *"
```

### Notification Channels

The system uses different notification channels for Android:
- `reminders` - For delivery notifications
- `default` - For general notifications

## 📱 Usage in App

### Check Delivery Reminders

```typescript
import { useApp } from '../context/AppContext';

const { checkDeliveryReminders } = useApp();

// Check for delivery reminders
await checkDeliveryReminders();
```

### Manual Testing

```typescript
import { useApp } from '../context/AppContext';

const { manualDeliveryCheck } = useApp();

// Test delivery notifications
const result = await manualDeliveryCheck();
console.log('Reminders found:', result.reminders);
console.log('Notifications sent:', result.notificationsSent);
```

### Get Notification History

```typescript
import { useApp } from '../context/AppContext';

const { getDeliveryNotificationHistory } = useApp();

// Get recent notification history
const history = await getDeliveryNotificationHistory();
```

## 🔍 Monitoring

### View Function Logs

```bash
# View recent logs
supabase functions logs check-delivery-reminders

# Follow logs in real-time
supabase functions logs check-delivery-reminders --follow
```

### Check Database

```sql
-- View recent notifications
SELECT * FROM delivery_notifications 
ORDER BY sent_at DESC 
LIMIT 10;

-- Check notification statistics
SELECT 
  notification_type,
  COUNT(*) as count,
  DATE(sent_at) as date
FROM delivery_notifications 
GROUP BY notification_type, DATE(sent_at)
ORDER BY date DESC;
```

### Monitor Push Tokens

```sql
-- Check active push tokens
SELECT user_id, COUNT(*) as token_count 
FROM push_tokens 
WHERE is_active = true 
GROUP BY user_id;
```

## 🛠️ Development

### Local Testing

1. **Start Supabase locally**:
   ```bash
   supabase start
   ```

2. **Apply migrations**:
   ```bash
   supabase db reset
   ```

3. **Test the function locally**:
   ```bash
   supabase functions serve check-delivery-reminders
   ```

4. **Call the function**:
   ```bash
   curl -X POST http://localhost:54321/functions/v1/check-delivery-reminders \
     -H "Content-Type: application/json"
   ```

### Adding New Notification Types

1. Update the `notification_type` enum in the database
2. Modify the edge function logic
3. Update the client-side service
4. Test thoroughly

## 🚨 Troubleshooting

### Common Issues

#### Notifications Not Sending

1. **Check push tokens**:
   ```sql
   SELECT * FROM push_tokens WHERE is_active = true;
   ```

2. **Verify notification permissions**:
   - Check app notification settings
   - Ensure push tokens are registered

3. **Check function logs**:
   ```bash
   supabase functions logs check-delivery-reminders
   ```

#### Function Not Running

1. **Check schedule**:
   ```bash
   supabase functions schedule list
   ```

2. **Verify function exists**:
   ```bash
   supabase functions list
   ```

3. **Check function status**:
   ```bash
   supabase functions logs check-delivery-reminders --follow
   ```

### Debug Mode

Enable debug logging in the edge function by adding:

```typescript
console.log('Debug: Processing user', userId);
console.log('Debug: Found reminders', reminders.length);
```

## 📈 Performance

### Optimization Tips

1. **Index Usage**: The system uses indexes on:
   - `user_id` for user-specific queries
   - `delivery_date` for date filtering
   - `notification_type` for type filtering

2. **Batch Processing**: The edge function processes users in batches to avoid timeouts

3. **Error Handling**: Failed notifications are logged but don't stop processing

### Scaling Considerations

- **Large User Base**: Consider processing users in smaller batches
- **High Order Volume**: Monitor database query performance
- **Notification Limits**: Respect Expo's push notification rate limits

## 🔒 Security

### Row Level Security (RLS)

The `delivery_notifications` table has RLS enabled:
- Users can only see their own notifications
- Service role can insert/update for the edge function

### Data Privacy

- Notification data is minimal and focused on delivery dates
- No sensitive order details are included in notifications
- All data is encrypted in transit and at rest

## 📝 API Reference

### Edge Function Endpoint

```
POST /functions/v1/check-delivery-reminders
```

**Headers**:
- `Content-Type: application/json`
- `Authorization: Bearer <token>` (optional for testing)

**Response**:
```json
{
  "message": "Delivery reminder check completed",
  "totalReminders": 5,
  "totalNotificationsSent": 3,
  "processedUsers": 10
}
```

## 🤝 Contributing

When contributing to the delivery notification system:

1. **Test thoroughly** with different delivery date scenarios
2. **Update documentation** for any new features
3. **Follow the existing code patterns**
4. **Add appropriate error handling**
5. **Test on both physical devices and simulators**

## 📞 Support

For issues or questions:

1. Check the troubleshooting section above
2. Review function logs for error details
3. Test with the manual testing functions
4. Verify database state and push token status

---

**Note**: This system requires an active Supabase project with the edge functions feature enabled. 