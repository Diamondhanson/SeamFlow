-- =============================================================================
-- SeamFlow Supabase Schema Setup
-- Run this file in the Supabase SQL Editor (Project: gmnkgnwjzuzzvcxbvsbf)
-- Execute in order. New project = fresh database, so no DROP IF EXISTS needed.
-- =============================================================================

-- Step 1: Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 2: users_profile (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users_profile (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT DEFAULT 'LYZMA CREATIONS',
  company_logo TEXT,
  measurement_attributes TEXT[] DEFAULT '{}',
  pin_hash TEXT,
  security_question_1 TEXT,
  security_answer_1_hash TEXT,
  security_question_2 TEXT,
  security_answer_2_hash TEXT,
  pin_reset_count INT DEFAULT 0,
  last_pin_reset TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users_profile (id, company_name)
  VALUES (NEW.id, 'LYZMA CREATIONS');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 3: clients
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  address TEXT DEFAULT '',
  measurements JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);

-- Step 4: orders (simple orders, linked to clients)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_name TEXT NOT NULL,
  date_ordered DATE NOT NULL,
  date_delivery DATE NOT NULL,
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered','in_progress','testing','on_pause','delivered','completed','cancelled')),
  price DECIMAL(12,2) DEFAULT 0,
  advance_payment DECIMAL(12,2) DEFAULT 0,
  image_1_url TEXT,
  image_2_url TEXT,
  colors TEXT[] DEFAULT '{}',
  fabrics TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON public.orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_date_delivery ON public.orders(date_delivery);

-- Step 5: bulk_orders
CREATE TABLE IF NOT EXISTS public.bulk_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_name TEXT NOT NULL,
  date_ordered DATE NOT NULL,
  date_delivery DATE NOT NULL,
  phone_number TEXT NOT NULL,
  address TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered','in_progress','testing','on_pause','delivered','completed','cancelled')),
  price DECIMAL(12,2) DEFAULT 0,
  advance_payment DECIMAL(12,2) DEFAULT 0,
  image_1_url TEXT,
  image_2_url TEXT,
  colors TEXT[] DEFAULT '{}',
  fabrics TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bulk_orders_user_id ON public.bulk_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_bulk_orders_date_delivery ON public.bulk_orders(date_delivery);

-- Step 6: bulk_order_members
CREATE TABLE IF NOT EXISTS public.bulk_order_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bulk_order_id UUID NOT NULL REFERENCES public.bulk_orders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  measurements JSONB DEFAULT '{}',
  notes TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_bulk_order_members_bulk_order_id ON public.bulk_order_members(bulk_order_id);

-- Step 7: designs
CREATE TABLE IF NOT EXISTS public.designs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  description TEXT,
  date_added TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_designs_user_id ON public.designs(user_id);

-- Step 8: inspirations
CREATE TABLE IF NOT EXISTS public.inspirations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  description TEXT,
  date_added TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inspirations_user_id ON public.inspirations(user_id);

-- Step 9: push_tokens (unique on user_id + device_id)
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  device_id TEXT NOT NULL,
  platform TEXT DEFAULT 'unknown',
  last_used TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON public.push_tokens(user_id);

-- Step 10: notification_logs (used by edge function)
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT,
  body TEXT,
  data JSONB,
  status TEXT CHECK (status IN ('sent','delivered','failed')),
  error_message TEXT,
  push_token_id UUID REFERENCES public.push_tokens(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON public.notification_logs(user_id);

-- Step 11: recovery_audit_log
CREATE TABLE IF NOT EXISTS public.recovery_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recovery_type TEXT NOT NULL,
  recovery_method TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recovery_audit_log_user_id ON public.recovery_audit_log(user_id);

-- Step 12: pin_attempt_tracking (unique on user_id for upsert)
CREATE TABLE IF NOT EXISTS public.pin_attempt_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  failed_attempts INT DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_attempt TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pin_attempt_tracking_user_id ON public.pin_attempt_tracking(user_id);

-- Step 13: Row Level Security (RLS)
ALTER TABLE public.users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_order_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspirations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pin_attempt_tracking ENABLE ROW LEVEL SECURITY;

-- users_profile: user owns their row
CREATE POLICY "users_profile_select_own" ON public.users_profile FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_profile_update_own" ON public.users_profile FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_profile_insert_own" ON public.users_profile FOR INSERT WITH CHECK (auth.uid() = id);

-- clients: user owns their rows
CREATE POLICY "clients_all_own" ON public.clients FOR ALL USING (auth.uid() = user_id);

-- orders: user owns their rows
CREATE POLICY "orders_all_own" ON public.orders FOR ALL USING (auth.uid() = user_id);

-- bulk_orders: user owns their rows
CREATE POLICY "bulk_orders_all_own" ON public.bulk_orders FOR ALL USING (auth.uid() = user_id);

-- bulk_order_members: via bulk_orders ownership
CREATE POLICY "bulk_order_members_all" ON public.bulk_order_members FOR ALL
  USING (EXISTS (SELECT 1 FROM public.bulk_orders b WHERE b.id = bulk_order_id AND b.user_id = auth.uid()));

-- designs: user owns their rows
CREATE POLICY "designs_all_own" ON public.designs FOR ALL USING (auth.uid() = user_id);

-- inspirations: user owns their rows
CREATE POLICY "inspirations_all_own" ON public.inspirations FOR ALL USING (auth.uid() = user_id);

-- push_tokens: user owns their rows
CREATE POLICY "push_tokens_all_own" ON public.push_tokens FOR ALL USING (auth.uid() = user_id);

-- notification_logs: user can read own (edge function uses service role for insert/update)
CREATE POLICY "notification_logs_select_own" ON public.notification_logs FOR SELECT USING (auth.uid() = user_id);

-- recovery_audit_log: user can insert/select own
CREATE POLICY "recovery_audit_log_insert_own" ON public.recovery_audit_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "recovery_audit_log_select_own" ON public.recovery_audit_log FOR SELECT USING (auth.uid() = user_id);

-- pin_attempt_tracking: user owns their row
CREATE POLICY "pin_attempt_tracking_all_own" ON public.pin_attempt_tracking FOR ALL USING (auth.uid() = user_id);
