
// src/lib/supabase/client.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabaseInstance: SupabaseClient | null = null;
let initializationError: Error | null = null;

if (!supabaseUrl || typeof supabaseUrl !== 'string' || supabaseUrl.trim() === '') {
  const errorMsg = 'Supabase URL is missing or invalid. Please ensure NEXT_PUBLIC_SUPABASE_URL environment variable is set correctly in your .env.local file and is a valid URL string.';
  console.error("***************************************************************************");
  console.error("FATAL ERROR INITIALIZING SUPABASE CLIENT (env var check):");
  console.error(errorMsg);
  console.error(`Current NEXT_PUBLIC_SUPABASE_URL type: ${typeof supabaseUrl}, value (if any): '${supabaseUrl}'`);
  console.error("Expected format: https://<your-project-ref>.supabase.co");
  console.error("***************************************************************************");
  initializationError = new Error(errorMsg);
} else if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
  const errorMsg = `The provided Supabase URL '${supabaseUrl}' does not start with http:// or https://. It seems you might be using a PostgreSQL connection string instead of your Supabase Project URL. Please use your Supabase Project URL (e.g., https://<your-project-ref>.supabase.co) for NEXT_PUBLIC_SUPABASE_URL.`;
  console.error("***************************************************************************");
  console.error("FATAL ERROR INITIALIZING SUPABASE CLIENT (URL format check):");
  console.error(errorMsg);
  console.error("***************************************************************************");
  initializationError = new Error(errorMsg);
}


if (!supabaseAnonKey || typeof supabaseAnonKey !== 'string' || supabaseAnonKey.trim() === '') {
  const errorMsg = 'Supabase Anon Key is missing or invalid. Please ensure NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is set correctly in your .env.local file.';
  console.error("***************************************************************************");
  console.error("FATAL ERROR INITIALIZING SUPABASE CLIENT (env var check):");
  console.error(errorMsg);
  console.error(`Current NEXT_PUBLIC_SUPABASE_ANON_KEY type: ${typeof supabaseAnonKey}`);
  console.error("***************************************************************************");
  if (!initializationError) { // Only set if not already set by URL error
    initializationError = new Error(errorMsg);
  }
}

if (!initializationError) {
  try {
    console.log(`Attempting to create Supabase client with URL: '${supabaseUrl}' and Anon Key starting with: '${supabaseAnonKey?.substring(0, 5)}...'`);
    supabaseInstance = createClient(supabaseUrl!, supabaseAnonKey!);
    console.log("Supabase client initialized successfully via createClient.");
  } catch (e: any) {
    const errorMsg = `Error during Supabase createClient call: ${e.message}. This likely means the URL or Key is still malformed or invalid despite initial checks.`;
    console.error("***************************************************************************");
    console.error("FATAL ERROR INITIALIZING SUPABASE CLIENT (during createClient call):");
    console.error(errorMsg);
    console.error("URL used:", supabaseUrl);
    console.error("Anon Key used starts with:", supabaseAnonKey?.substring(0, 5) + "...");
    console.error("Original error:", e);
    console.error("***************************************************************************");
    initializationError = new Error(errorMsg);
  }
} else {
    console.error("Supabase client was NOT initialized due to errors in environment variables or URL format. See previous logs.");
}

export const supabase = {
  get client(): SupabaseClient {
    if (initializationError) {
      console.error("Attempted to access Supabase client, but initialization failed:", initializationError.message);
      throw new Error(`Supabase client could not be initialized: ${initializationError.message}`);
    }
    if (!supabaseInstance) {
      // This should ideally be caught by initializationError, but serves as a fallback.
      const criticalError = "Supabase client instance is null and no initializationError was set. This is an unexpected state. Please check setup and env vars.";
      console.error(criticalError);
      throw new Error(criticalError);
    }
    return supabaseInstance;
  }
};
