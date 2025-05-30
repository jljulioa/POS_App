
// src/lib/supabase/client.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabaseInstance: SupabaseClient | null = null;
let initializationError: Error | null = null;

if (!supabaseUrl || typeof supabaseUrl !== 'string' || supabaseUrl.trim() === '') {
  const errorMsg = 'Supabase URL is missing or invalid. Please ensure NEXT_PUBLIC_SUPABASE_URL environment variable is set correctly in your .env.local file and is a valid URL string.';
  console.error("***************************************************************************");
  console.error("FATAL ERROR INITIALIZING SUPABASE CLIENT:");
  console.error(errorMsg);
  console.error(`Current NEXT_PUBLIC_SUPABASE_URL type: ${typeof supabaseUrl}, value (if any): ${supabaseUrl}`);
  console.error("***************************************************************************");
  initializationError = new Error(errorMsg);
}

if (!supabaseAnonKey || typeof supabaseAnonKey !== 'string' || supabaseAnonKey.trim() === '') {
  const errorMsg = 'Supabase Anon Key is missing or invalid. Please ensure NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is set correctly in your .env.local file.';
  console.error("***************************************************************************");
  console.error("FATAL ERROR INITIALIZING SUPABASE CLIENT:");
  console.error(errorMsg);
  console.error(`Current NEXT_PUBLIC_SUPABASE_ANON_KEY type: ${typeof supabaseAnonKey}`);
  console.error("***************************************************************************");
  if (!initializationError) { // Only set if not already set by URL error
    initializationError = new Error(errorMsg);
  }
}

if (!initializationError) {
  try {
    supabaseInstance = createClient(supabaseUrl!, supabaseAnonKey!);
    console.log("Supabase client initialized successfully.");
  } catch (e: any) {
    const errorMsg = `Error initializing Supabase client: ${e.message}. This likely means the URL or Key is still malformed despite passing initial checks.`;
    console.error("***************************************************************************");
    console.error("FATAL ERROR INITIALIZING SUPABASE CLIENT (during createClient):");
    console.error(errorMsg);
    console.error("URL used:", supabaseUrl);
    console.error("Anon Key used starts with:", supabaseAnonKey?.substring(0, 5) + "..."); // Log only a snippet of the key
    console.error("***************************************************************************");
    initializationError = new Error(errorMsg);
  }
} else {
    // If there was an error in initial checks, supabaseInstance remains null
    console.error("Supabase client NOT initialized due to missing/invalid environment variables.");
}


// Export a getter function or the instance directly.
// Using a getter can be slightly safer if you want to ensure errors are thrown if accessed when null.
export const supabase = {
  get client(): SupabaseClient {
    if (initializationError) {
      // This error will be thrown if any part of the app tries to use supabase.client
      // when initialization failed.
      throw new Error(`Supabase client could not be initialized: ${initializationError.message}`);
    }
    if (!supabaseInstance) {
      // This case should ideally be caught by the initializationError above,
      // but serves as a final fallback.
      throw new Error("Supabase client is not available. Check initialization logs.");
    }
    return supabaseInstance;
  }
};

// For direct export if you prefer, but the getter provides a clearer error path.
// if (!supabaseInstance) {
//   throw new Error("Supabase client failed to initialize. Check logs for details.");
// }
// export const supabaseDirect = supabaseInstance;
