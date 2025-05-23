
// src/lib/db.ts
import { Pool, type PoolConfig } from 'pg';

let pool: Pool | null = null;
let poolInitializationError: Error | null = null;

async function initializePool(): Promise<Pool> {
  const connectionString = process.env.POSTGRES_URL;

  console.log("Attempting to initialize PostgreSQL pool.");
  // Avoid logging the full string with password in production logs if possible,
  // but for local debugging, seeing part of it can be helpful.
  console.log("Raw POSTGRES_URL from env (first 20 chars):", connectionString?.substring(0, 20) || "UNDEFINED or EMPTY");

  if (!connectionString) {
    const err = new Error("POSTGRES_URL environment variable is not set or is empty.");
    console.error(err.message);
    poolInitializationError = err;
    throw err;
  }

  const config: PoolConfig = {
    connectionString: connectionString,
  };

  // Explicitly configure SSL if sslmode=require is detected or implied by cloud providers like Neon/Supabase.
  // Supabase/Neon connection strings usually include ?sslmode=require or similar.
  if (connectionString.includes('sslmode=require') || connectionString.includes('supabase.com') || connectionString.includes('neon.tech')) {
    console.log("SSL requirement detected or implied. Applying explicit SSL configuration.");
    config.ssl = {
      rejectUnauthorized: false, // IMPORTANT: Insecure for production. For debugging SSL issues only.
                                 // If this fixes it, the issue is SSL cert validation.
                                 // For production, you'd need to properly configure CA certs or ensure Node's trust store is correct.
    };
  } else {
    console.log("No explicit SSL requirement detected in connection string for custom SSL config. Relying on default pg behavior.");
  }


  console.log("Creating PostgreSQL pool with derived config. Connection string masked. SSL config:", config.ssl ? 'Explicitly set' : 'Default');

  const newPool = new Pool(config);

  try {
    const client = await newPool.connect();
    console.log("Successfully connected to PostgreSQL database and tested connection!");
    client.release();
    poolInitializationError = null; // Clear any previous init error on success
    return newPool;
  } catch (err) {
    const connectionError = new Error(`Failed to connect to PostgreSQL database: ${(err as Error).message}`);
    console.error("Error during pool.connect():", connectionError.message);
    console.error("Original error stack:", (err as Error).stack);
    console.error("Review your POSTGRES_URL and network/firewall settings. If using SSL, ensure certificates are trusted or try diagnostic SSL options.");
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
    // If a persistent initialization error occurred, throw it to prevent retries.
    console.error("Persistent pool initialization error encountered. Throwing stored error:", poolInitializationError.message);
    throw poolInitializationError;
  }
  if (!pool) {
    try {
      pool = await initializePool();
      // Attach an error handler for idle clients in the pool
      pool.on('error', (err, client) => {
        console.error('Unexpected error on idle PostgreSQL client. Pool will be reset.', err);
        // Consider strategies like attempting to re-initialize the pool or marking it as unhealthy.
        poolInitializationError = err; // Mark that an error occurred
        pool = null; // Reset pool so it tries to re-initialize on next call (or fails due to poolInitializationError)
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
    currentPool = await getPool(); // getPool is now async
  } catch (error) {
    // Error is already logged by getPool/initializePool
    // console.error("Failed to get database pool for query:", (error as Error).message); // Redundant
    throw new Error(`Failed to acquire database pool: ${(error as Error).message}`);
  }
  
  try {
    // console.log(`Executing query: ${sql} with params: ${params ? JSON.stringify(params) : '[]'}`); // For debugging SQL
    const results = await currentPool.query(sql, params);
    return results.rows;
  } catch (error) {
    console.error("Database query error:", (error as Error).message, "\nSQL:", sql, "\nParams:", params);
    console.error("Original query error stack:", (error as Error).stack);
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
      poolInitializationError = null; // Clear any stored initialization error
    }
  }
}

// Optional: A function to be called at application startup if you want to pre-warm the pool
// or check DB connection early. This can help surface connection issues sooner.
export async function ensureDbConnected() {
  try {
    console.log("ensureDbConnected: Attempting to get pool...");
    await getPool(); 
    console.log("ensureDbConnected: Database connection health check successful.");
  } catch (error) {
    // Error is already logged by getPool/initializePool
    console.error("ensureDbConnected: Initial database connection health check failed.");
    // Depending on your application's needs, you might want to rethrow or handle this.
  }
}
