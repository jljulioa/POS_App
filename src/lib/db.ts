
// src/lib/db.ts
import { Pool, type PoolConfig } from 'pg';

let pool: Pool | null = null;
let poolInitializationError: Error | null = null;

async function initializePool(): Promise<Pool> {
  console.log("Attempting to initialize PostgreSQL pool (initializePool function called).");

  const connectionString = process.env.POSTGRES_URL;

  if (poolInitializationError && poolInitializationError.message.includes('Failed to connect to PostgreSQL database during pool initialization')) {
    console.error("initializePool: Persistent critical error from previous initialization attempt. Aborting further attempts.", poolInitializationError);
    throw poolInitializationError;
  }
  poolInitializationError = null; // Reset for a fresh attempt

  if (!connectionString || typeof connectionString !== 'string' || connectionString.trim() === '') {
    const err = new Error("POSTGRES_URL environment variable is not set or is empty. Please check your .env.local file.");
    console.error("***************************************************************************");
    console.error("FATAL ERROR INITIALIZING POSTGRESQL POOL (env var check):");
    console.error(err.message);
    console.error(`Current POSTGRES_URL type: ${typeof connectionString}, value (if any): '${connectionString}'`);
    console.error("Expected format: postgresql://user:password@host:port/database?sslmode=require");
    console.error("***************************************************************************");
    poolInitializationError = err;
    throw err;
  }

  // Mask password for logging connection string
  const maskedConnectionString = connectionString.replace(/:([^:@]*)(?=@)/, ':********');
  console.log("initializePool: Using POSTGRES_URL (password masked):", maskedConnectionString);

  const config: PoolConfig = {
    connectionString: connectionString,
  };

  // Explicitly configure SSL for providers like Supabase/Neon
  // The connection string from Supabase/Neon usually includes ?sslmode=require or similar.
  if (connectionString.includes('sslmode=require') || connectionString.includes('supabase.com') || connectionString.includes('neon.tech')) {
    console.log("initializePool: SSL requirement detected or implied for Supabase/Neon. Applying explicit SSL configuration: { rejectUnauthorized: false } for development/diagnostic purposes.");
    config.ssl = {
      rejectUnauthorized: false, // IMPORTANT: For development/diagnostics ONLY. Not recommended for production without proper CA setup.
    };
  } else {
    console.log("initializePool: No explicit SSL requirement detected for Supabase/Neon in connection string for custom SSL config. Relying on default pg behavior. If connection fails, ensure your POSTGRES_URL includes ?sslmode=require for these providers.");
  }

  console.log("initializePool: Creating new PostgreSQL pool with derived config. Effective SSL config:", config.ssl ? JSON.stringify(config.ssl) : 'Default/None');

  const newPool = new Pool(config);

  try {
    const client = await newPool.connect();
    console.log("initializePool: Successfully connected to PostgreSQL database and tested connection!");
    client.release();
    return newPool;
  } catch (err) {
    const connectionError = new Error(`Failed to connect to PostgreSQL database during pool initialization: ${(err as Error).message}`);
    console.error("***************************************************************************");
    console.error("CRITICAL ERROR during newPool.connect():", connectionError.message);
    console.error("Original error stack:", (err as Error).stack);
    console.error("Database connection string used (masked):", maskedConnectionString);
    console.error("SSL Configuration used:", config.ssl ? JSON.stringify(config.ssl) : 'Default/None');
    console.error("Please verify your POSTGRES_URL, network/firewall settings, and database server status (e.g., on Supabase/Neon dashboard).");
    console.error("***************************************************************************");
    poolInitializationError = connectionError;
    try {
      await newPool.end().catch(cleanupErr => console.error("initializePool: Error during pool cleanup after connection failure:", cleanupErr));
    } catch (cleanupErr) {
      console.error("initializePool: Exception during pool cleanup attempt after connection failure:", cleanupErr);
    }
    throw connectionError;
  }
}

export async function getPool(): Promise<Pool> {
  console.log("getPool: Attempting to get pool...");
  if (poolInitializationError) {
    console.error("getPool: Persistent pool initialization error encountered. Throwing stored error:", poolInitializationError.message);
    throw poolInitializationError;
  }
  if (!pool) {
    console.log("getPool: Pool does not exist or was reset. Attempting to initialize a new pool.");
    try {
      pool = await initializePool();
      console.log("getPool: New pool initialized successfully.");
      pool.on('error', (err, client) => {
        console.error('getPool: Unexpected error on idle PostgreSQL client. Pool will be reset.', err);
        poolInitializationError = err; // Store the error
        pool = null; // Reset pool so it tries to re-initialize on next call, or fails due to poolInitializationError
      });
    } catch (err) {
      // initializePool already logs the error comprehensively and sets poolInitializationError.
      console.error("getPool: Error during initializePool call:", (err as Error).message);
      // No need to log again here, just rethrow so the caller knows.
      // The poolInitializationError will be set by initializePool.
      throw err;
    }
  } else {
     console.log("getPool: Returning existing pool.");
  }
  return pool;
}

export async function query(sql: string, params?: any[]) {
  let currentPool: Pool;
  try {
    currentPool = await getPool();
  } catch (error) {
    // Error is already logged by getPool/initializePool
    // console.error("Failed to get database pool for query:", (error as Error).message); // Redundant
    throw new Error(`Failed to acquire database pool: ${(error as Error).message}`);
  }
  
  try {
    const startTime = Date.now();
    // console.log(`Executing query: ${sql} with params: ${params ? JSON.stringify(params) : '[]'}`); // Uncomment for debugging SQL queries
    const results = await currentPool.query(sql, params);
    const duration = Date.now() - startTime;
    // console.log(`Query executed successfully in ${duration}ms. Rows returned: ${results.rowCount}`); // Uncomment for performance logging
    return results.rows;
  } catch (error) {
    console.error("***************************************************************************");
    console.error("DATABASE QUERY ERROR:");
    console.error("Message:", (error as Error).message);
    console.error("SQL:", sql);
    console.error("Params:", params ? JSON.stringify(params) : "[]");
    // console.error("Original query error stack:", (error as Error).stack); // Uncomment for more detailed stack trace
    console.error("***************************************************************************");
    throw new Error(`Database query execution failed: ${(error as Error).message}`);
  }
}

// This function is typically called during application shutdown, which is less common in serverless environments.
export async function closePool() {
  if (pool) {
    try {
      await pool.end();
      console.log("Database pool explicitly closed.");
    } catch(err) {
      console.error("Error closing database pool:", err);
    } finally {
      pool = null;
      poolInitializationError = null;
    }
  }
}

// Helper for initial connection check, can be called at application startup.
export async function ensureDbConnected() {
  console.log("ensureDbConnected: Starting database connection health check...");
  try {
    const currentPool = await getPool();
    const client = await currentPool.connect();
    await client.query('SELECT NOW()'); // Simple query to test connection
    client.release();
    console.log("ensureDbConnected: Database connection health check successful.");
    return true;
  } catch (error) {
    console.error("ensureDbConnected: Database connection health check FAILED. Error:", (error as Error).message);
    // The detailed error should have been logged by initializePool or getPool.
    return false;
  }
}

// Optional: Call ensureDbConnected at module load if you want to check connection eagerly on server start.
// This might have implications in serverless environments.
// ensureDbConnected();
    