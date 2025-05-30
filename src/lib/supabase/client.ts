
// src/lib/supabase/client.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Supabase URL or Anon Key is missing. ' +
    'Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables are set.'
  );
  // You might throw an error here or handle it gracefully depending on your app's needs
  // For now, we'll allow initialization to proceed, but Supabase calls will fail.
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl!, // The ! asserts that these will be non-null, guarded by the check above
  supabaseAnonKey!
);
