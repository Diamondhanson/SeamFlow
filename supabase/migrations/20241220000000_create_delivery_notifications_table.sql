-- Create delivery_notifications table
CREATE TABLE IF NOT EXISTS delivery_notifications (
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_delivery_notifications_user_id ON delivery_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notifications_order_id ON delivery_notifications(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notifications_delivery_date ON delivery_notifications(delivery_date);
CREATE INDEX IF NOT EXISTS idx_delivery_notifications_sent_at ON delivery_notifications(sent_at);
CREATE INDEX IF NOT EXISTS idx_delivery_notifications_notification_type ON delivery_notifications(notification_type);

-- Add RLS (Row Level Security) policies
ALTER TABLE delivery_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own delivery notifications
CREATE POLICY "Users can view own delivery notifications" ON delivery_notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Service role can insert delivery notifications (for the edge function)
CREATE POLICY "Service role can insert delivery notifications" ON delivery_notifications
  FOR INSERT WITH CHECK (true);

-- Policy: Service role can update delivery notifications
CREATE POLICY "Service role can update delivery notifications" ON delivery_notifications
  FOR UPDATE USING (true);

-- Add is_active column to push_tokens table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'push_tokens' AND column_name = 'is_active') THEN
    ALTER TABLE push_tokens ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Create index on push_tokens for active tokens
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(user_id, is_active) WHERE is_active = true; 