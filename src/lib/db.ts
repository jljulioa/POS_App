
// src/lib/db.ts
import { Pool, type PoolConfig } from 'pg';

let pool: Pool | null = null;
let poolInitializationError: Error | null = null;

async function initializePool(): Promise<Pool> {
  const connectionString = process.env.POSTGRES_URL;

  console.log("Attempting to initialize PostgreSQL pool.");

  if (!connectionString) {
    const err = new Error("POSTGRES_URL environment variable is not set or is empty. Please check your .env.local file.");
    console.error(err.message);
    poolInitializationError = err;
    throw err;
  }

  // Mask password for logging connection string
  const maskedConnectionString = connectionString.replace(/:([^:@]*)(?=@)/, ':********');
  console.log("Using POSTGRES_URL (password masked):", maskedConnectionString);


  const config: PoolConfig = {
    connectionString: connectionString,
  };

  // Explicitly configure SSL for providers like Supabase/Neon
  // The connection string from Supabase/Neon usually includes ?sslmode=require or similar.
  if (connectionString.includes('sslmode=require') || connectionString.includes('supabase.com') || connectionString.includes('neon.tech')) {
    console.log("SSL requirement detected or implied. Applying explicit SSL configuration: { rejectUnauthorized: false } for development/diagnostic purposes.");
    config.ssl = {
      rejectUnauthorized: false, // IMPORTANT: For development/diagnostics ONLY. Not recommended for production without proper CA setup.
    };
  } else {
    console.log("No explicit SSL requirement detected for Supabase/Neon in connection string for custom SSL config. Relying on default pg behavior. If connection fails, ensure your POSTGRES_URL includes ?sslmode=require for these providers.");
  }

  console.log("Creating PostgreSQL pool with derived config. SSL config:", config.ssl ? 'Explicitly set as above' : 'Default/None');

  const newPool = new Pool(config);

  try {
    const client = await newPool.connect();
    console.log("Successfully connected to PostgreSQL database and tested connection!");
    client.release();
    poolInitializationError = null; // Clear any previous init error on success
    return newPool;
  } catch (err) {
    const connectionError = new Error(`Failed to connect to PostgreSQL database during pool initialization: ${(err as Error).message}`);
    console.error("Error during newPool.connect():", connectionError.message);
    console.error("Original error stack:", (err as Error).stack);
    console.error("Please verify your POSTGRES_URL, network/firewall settings, and database server status (e.g., on Supabase/Neon dashboard).");
    poolInitializationError = connectionError;
    try {
      await newPool.end(); // Attempt to clean up the partially initialized pool
    } catch (cleanupErr) {
      console.error("Error during pool cleanup after connection failure:", cleanupErr);
    }
    throw connectionError;
  }
}

export async function getPool(): Promise<Pool> {
  if (poolInitializationError) {
    console.error("Persistent pool initialization error encountered. Throwing stored error:", poolInitializationError.message);
    throw poolInitializationError;
  }
  if (!pool) {
    console.log("Pool does not exist or was reset. Attempting to initialize a new pool.");
    try {
      pool = await initializePool();
      pool.on('error', (err, client) => {
        console.error('Unexpected error on idle PostgreSQL client. Pool will be reset.', err);
        poolInitializationError = err;
        pool = null; // Reset pool so it tries to re-initialize on next call or fails due to poolInitializationError
      });
    } catch (err) {
      // initializePool already logs the error and sets poolInitializationError.
      // No need to log again here, just rethrow.
      throw err;
    }
  }
  return pool;
}

export async function query(sql: string, params?: any[]) {
  let currentPool: Pool;
  try {
    currentPool = await getPool();
  } catch (error) {
    throw new Error(`Failed to acquire database pool: ${(error as Error).message}`);
  }
  
  try {
    // console.log(`Executing query: ${sql} with params: ${params ? JSON.stringify(params) : '[]'}`); // Uncomment for debugging SQL queries
    const results = await currentPool.query(sql, params);
    return results.rows;
  } catch (error) {
    console.error("Database query error:", (error as Error).message, "\nSQL:", sql, "\nParams:", params ? JSON.stringify(params) : "[]");
    // console.error("Original query error stack:", (error as Error).stack); // Uncomment for more detailed stack trace
    throw new Error(`Database query execution failed: ${(error as Error).message}`);
  }
}

export async function closePool() {
  if (pool) {
    try {
      await pool.end();
      console.log("Database pool closed.");
    } catch(err) {
      console.error("Error closing database pool:", err);
    } finally {
      pool = null;
      poolInitializationError = null;
    }
  }
}

export async function ensureDbConnected() {
  try {
    console.log("ensureDbConnected: Attempting to get pool...");
    await getPool(); 
    console.log("ensureDbConnected: Database connection health check successful.");
  } catch (error) {
    console.error("ensureDbConnected: Initial database connection health check failed. Error:", (error as Error).message);
  }
}

// Optional: Call ensureDbConnected at module load if you want to check connection eagerly on server start.
// Note: This might not be ideal for all Next.js edge/serverless environments.
// ensureDbConnected();
