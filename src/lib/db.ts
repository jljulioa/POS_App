
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
  console.log("initializePool: Full POSTGRES_URL being used (ensure this is correct):", connectionString);


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
    console.error("Full connection string that failed (check this carefully):", connectionString);
    console.error("SSL Configuration used:", config.ssl ? JSON.stringify(config.ssl) : 'Default/None');
    console.error("Please verify your POSTGRES_URL, network/firewall settings, and database server status (e.g., on Supabase/Neon dashboard).");
    console.error("Ensure the host and port are correct for the type of connection (direct vs. pooler). Poolers typically use port 6543.");
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
  // console.log("getPool: Attempting to get pool..."); // Reduced verbosity
  if (poolInitializationError) {
    console.error("getPool: Persistent pool initialization error encountered. Throwing stored error:", poolInitializationError.message);
    throw poolInitializationError;
  }
  if (!pool) {
    // console.log("getPool: Pool does not exist or was reset. Attempting to initialize a new pool."); // Reduced verbosity
    try {
      pool = await initializePool();
      // console.log("getPool: New pool initialized successfully."); // Reduced verbosity
      pool.on('error', (err, client) => {
        console.error('getPool: Unexpected error on idle PostgreSQL client. Pool will be reset.', err);
        poolInitializationError = err; 
        pool = null; 
      });
    } catch (err) {
      console.error("getPool: Error during initializePool call:", (err as Error).message);
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
    const startTime = Date.now();
    const results = await currentPool.query(sql, params);
    const duration = Date.now() - startTime;
    // console.log(`Query executed successfully in ${duration}ms. Rows returned: ${results.rowCount}`); 
    return results.rows;
  } catch (error) {
    console.error("***************************************************************************");
    console.error("DATABASE QUERY ERROR:");
    console.error("Message:", (error as Error).message);
    console.error("SQL:", sql);
    console.error("Params:", params ? JSON.stringify(params) : "[]");
    console.error("***************************************************************************");
    throw new Error(`Database query execution failed: ${(error as Error).message}`);
  }
}

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

export async function ensureDbConnected() {
  console.log("ensureDbConnected: Starting database connection health check...");
  try {
    const currentPool = await getPool();
    const client = await currentPool.connect();
    await client.query('SELECT NOW()'); 
    client.release();
    console.log("ensureDbConnected: Database connection health check successful.");
    return true;
  } catch (error) {
    console.error("ensureDbConnected: Database connection health check FAILED. Error:", (error as Error).message);
    return false;
  }
}
