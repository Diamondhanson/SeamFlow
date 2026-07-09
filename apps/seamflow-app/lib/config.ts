function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing env var ${name}. Add it to apps/seamflow-app/.env`);
  }
  return value;
}

export const config = {
  apiUrl: required('EXPO_PUBLIC_API_URL', process.env.EXPO_PUBLIC_API_URL),
  // Marketing + legal site (roadmap 3.12). Optional — defaults to the public
  // domain so the in-app Privacy/Terms links work without extra setup.
  webUrl: process.env.EXPO_PUBLIC_WEB_URL || 'https://seamflow.app',
  supabaseUrl: required('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: required(
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  ),
};
