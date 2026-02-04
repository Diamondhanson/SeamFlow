# SeamFlow Supabase Setup Guide

This guide walks through setting up the new Supabase project for SeamFlow.

## 1. Configuration (Done)

- [supabaseConfig.ts](supabaseConfig.ts) has been updated with the new project credentials.

## 2. Run SQL in Supabase SQL Editor

Open your project: https://supabase.com/dashboard/project/gmnkgnwjzuzzvcxbvsbf

### 2.1 Database schema and RLS

1. Go to **SQL Editor**
2. Create a new query
3. Copy the full contents of [supabase_schema_setup.sql](supabase_schema_setup.sql)
4. Run the query

### 2.2 Storage bucket

1. Go to **Storage** → **New bucket**
2. Name: `seamflow-images`
3. Public bucket: **Yes**
4. File size limit: Optional (e.g. 5MB)
5. Create bucket

### 2.3 Storage policies

1. Go to **SQL Editor**
2. Create a new query
3. Copy the full contents of [supabase_storage_setup.sql](supabase_storage_setup.sql)
4. Run the query

## 3. Deploy edge function (optional, for push notifications)

From the project root:

```bash
supabase link --project-ref gmnkgnwjzuzzvcxbvsbf
supabase functions deploy send-push-notification
```

## 4. Auth providers

In **Authentication** → **Providers**:

- **Email** – Enable (default)
- **Google** – Configure if using OAuth (add client IDs from your app)
- Add **Redirect URLs** for your app (e.g. Expo auth callback)

## 5. Post-setup

1. Sign up / sign in with email or Google
2. Test clients, orders, designs, and push notifications
