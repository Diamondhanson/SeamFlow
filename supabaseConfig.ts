import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://gmnkgnwjzuzzvcxbvsbf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtbmtnbndqenV6enZjeGJ2c2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNDIwNjEsImV4cCI6MjA4NTcxODA2MX0.EGnqTXwbXfZRrvZ63cJI2rmBWWRjmpGDNuWI0ziXTWs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
}); 