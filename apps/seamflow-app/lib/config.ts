function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing env var ${name}. Add it to apps/seamflow-app/.env`);
  }
  return value;
}

export const config = {
  apiUrl: required('EXPO_PUBLIC_API_URL', process.env.EXPO_PUBLIC_API_URL),
  supabaseUrl: required('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: required(
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  ),
  devEmail: process.env.EXPO_PUBLIC_DEV_EMAIL ?? null,
  devPassword: process.env.EXPO_PUBLIC_DEV_PASSWORD ?? null,
};

export const devLoginEnabled = !!(config.devEmail && config.devPassword);
