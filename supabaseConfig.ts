import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://iwawhmcdymzqeukolwzm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3YXdobWNkeW16cWV1a29sd3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0NTQ5NjYsImV4cCI6MjA2NjAzMDk2Nn0.YXTXyibmBF9R60z8E9YF2ZVHkLPAsuO8ALPrWPJi-J8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
}); 