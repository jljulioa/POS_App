
// src/lib/supabase/client.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrlFromEnv = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKeyFromEnv = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabaseInstance: SupabaseClient | null = null;
let initializationError: Error | null = null;

if (!supabaseUrlFromEnv || typeof supabaseUrlFromEnv !== 'string' || supabaseUrlFromEnv.trim() === '') {
  const errorMsg = 'CRITICAL: NEXT_PUBLIC_SUPABASE_URL environment variable is missing or empty. Please ensure it is set correctly in your .env.local file. It should be your Supabase Project URL (e.g., https://<your-project-ref>.supabase.co).';
  console.error("***************************************************************************");
  console.error("SUPABASE CLIENT INIT ERROR:", errorMsg);
  console.error("***************************************************************************");
  initializationError = new Error(errorMsg);
} else if (!supabaseUrlFromEnv.startsWith('http://') && !supabaseUrlFromEnv.startsWith('https://')) {
  const errorMsg = `CRITICAL: The NEXT_PUBLIC_SUPABASE_URL '${supabaseUrlFromEnv}' does not start with http:// or https://. It seems you might be using a PostgreSQL connection string instead of your Supabase Project URL. Please use your Supabase Project URL (e.g., https://<your-project-ref>.supabase.co) for NEXT_PUBLIC_SUPABASE_URL.`;
  console.error("***************************************************************************");
  console.error("SUPABASE CLIENT INIT ERROR:", errorMsg);
  console.error("***************************************************************************");
  initializationError = new Error(errorMsg);
}


if (!supabaseAnonKeyFromEnv || typeof supabaseAnonKeyFromEnv !== 'string' || supabaseAnonKeyFromEnv.trim() === '') {
  const errorMsg = 'CRITICAL: NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is missing or empty. Please ensure it is set correctly in your .env.local file. It should be your Supabase Anon (public) Key.';
  console.error("***************************************************************************");
  console.error("SUPABASE CLIENT INIT ERROR:", errorMsg);
  console.error("***************************************************************************");
  if (!initializationError) { 
    initializationError = new Error(errorMsg);
  }
}

if (!initializationError) {
  try {
    console.log(`Supabase Client: Attempting to initialize with URL: '${supabaseUrlFromEnv}' and Anon Key starting with: '${supabaseAnonKeyFromEnv?.substring(0, 10)}...'`);
    supabaseInstance = createClient(supabaseUrlFromEnv!, supabaseAnonKeyFromEnv!);
    console.log("Supabase Client: Successfully initialized via createClient.");
  } catch (e: any) {
    const errorMsg = `Supabase Client: Error during createClient call: ${e.message}. This likely means the URL or Key is still malformed or invalid despite initial checks.`;
    console.error("***************************************************************************");
    console.error("SUPABASE CLIENT INIT ERROR (during createClient call):", errorMsg);
    console.error("URL used:", supabaseUrlFromEnv);
    console.error("Anon Key used (first 10 chars):", supabaseAnonKeyFromEnv?.substring(0, 10) + "...");
    console.error("Original error:", e);
    console.error("***************************************************************************");
    initializationError = new Error(errorMsg);
  }
} else {
    console.error("Supabase Client: NOT initialized due to errors in environment variables or URL format. See previous critical logs.");
}

export const supabase = {
  get client(): SupabaseClient {
    if (initializationError) {
      console.error("Supabase Client: Attempted to access client, but initialization previously failed:", initializationError.message);
      throw new Error(`Supabase client could not be initialized: ${initializationError.message}`);
    }
    if (!supabaseInstance) {
      const criticalError = "Supabase Client: Instance is null and no initializationError was set. This is an unexpected state. Please check setup and environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) in .env.local and restart the server.";
      console.error(criticalError);
      throw new Error(criticalError);
    }
    return supabaseInstance;
  }
};
