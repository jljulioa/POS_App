// src/lib/db.ts
import { Pool } from 'pg';

let pool: Pool | null = null;
let poolInitializationError: Error | null = null;

// Function to initialize the pool and test the connection
async function initializePool(): Promise<Pool> {
  if (!process.env.POSTGRES_URL) {
    const err = new Error("POSTGRES_URL environment variable is not set.");
    console.error(err.message);
    poolInitializationError = err; // Store error to prevent retries
    throw err;
  }

  console.log("Attempting to create PostgreSQL pool...");
  const newPool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    // Neon typically handles SSL via the connection string with ?sslmode=require
    // If you still face SSL issues, you might try uncommenting the following for diagnostic purposes,
    // but be aware of the security implications of rejectUnauthorized: false.
    // ssl: {
    //   rejectUnauthorized: false,
    // }
  });

  try {
    const client = await newPool.connect();
    console.log("Successfully connected to PostgreSQL database and tested connection!");
    client.release(); // Release the client back to the pool
    poolInitializationError = null; // Clear any previous init error on success
    return newPool;
  } catch (err) {
    const connectionError = new Error(`Failed to connect to PostgreSQL database: ${(err as Error).message}`);
    console.error(connectionError.message, err); // Log the original error as well
    poolInitializationError = connectionError; // Store error
    // Attempt to clean up the pool if connection test fails
    try {
      await newPool.end();
    } catch (cleanupErr) {
      console.error("Error during pool cleanup after connection failure:", cleanupErr);
    }
    throw connectionError;
  }
}

// getPool is now async
export async function getPool(): Promise<Pool> {
  if (poolInitializationError) {
    // If a persistent initialization error occurred, throw it to prevent retries
    // that are likely to fail in the same way.
    throw poolInitializationError;
  }
  if (!pool) {
    try {
      pool = await initializePool();
      // Attach an error handler for idle clients in the pool
      pool.on('error', (err, client) => {
        console.error('Unexpected error on idle PostgreSQL client', err);
        // Consider strategies like attempting to re-initialize the pool or marking it as unhealthy.
        // For now, we'll log and if it's critical, subsequent getPool calls might fail if pool is reset.
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
    console.error("Failed to get database pool for query:", error);
    throw new Error(`Failed to acquire database pool: ${(error as Error).message}`);
  }
  
  try {
    const results = await currentPool.query(sql, params);
    return results.rows;
  } catch (error) {
    console.error("Database query error:", error);
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
    await getPool(); 
    console.log("Database connection health check successful via ensureDbConnected.");
  } catch (error) {
    // Error is already logged by getPool/initializePool
    console.error("Initial database connection health check failed via ensureDbConnected.");
    // Depending on your application's needs, you might want to rethrow or handle this.
  }
}
