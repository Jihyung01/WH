import { createClient } from '@supabase/supabase-js';
import { supabaseAuthStorage } from '../stores/supabaseAuthStorage';

/** trim: .env 앞뒤 공백만으로도 URL/키가 달라져 JWT 검증이 깨질 수 있음 */
export const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://your-project.supabase.co').trim();
export const SUPABASE_ANON_KEY = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'your-anon-key').trim();

if (__DEV__ && (SUPABASE_URL.includes('your-project') || SUPABASE_ANON_KEY === 'your-anon-key')) {
  console.error(
    '[Supabase] .env에 실제 값을 넣으세요. Dashboard → Settings → API의 Project URL / anon public key → EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY',
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: supabaseAuthStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});
