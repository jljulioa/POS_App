
// src/lib/db.ts
import { Pool, type PoolConfig } from 'pg';

let pool: Pool | null = null;
let poolInitializationError: Error | null = null;

async function initializePool(): Promise<Pool> {
  console.log("PostgreSQL Pool: Attempting initialization (initializePool function).");

  const connectionString = process.env.POSTGRES_URL;

  if (poolInitializationError && poolInitializationError.message.includes('Failed to connect to PostgreSQL database during pool initialization')) {
    console.error("PostgreSQL Pool: Persistent critical error from previous initialization attempt. Aborting.", poolInitializationError);
    throw poolInitializationError;
  }
  poolInitializationError = null; // Reset for a fresh attempt

  if (!connectionString || typeof connectionString !== 'string' || connectionString.trim() === '') {
    const err = new Error("POSTGRES_URL environment variable is not set or is empty. Ensure it is configured in your server environment.");
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
  console.log("PostgreSQL Pool: Using connection string (password masked):", maskedConnectionString);
  // console.log("PostgreSQL Pool: Full connection string being used (ensure this is correct):", connectionString); // Verbose, can be enabled for deep debugging


  const config: PoolConfig = {
    connectionString: connectionString,
  };

  if (connectionString.includes('sslmode=require') || connectionString.includes('supabase.com') || connectionString.includes('neon.tech')) {
    console.log("PostgreSQL Pool: SSL requirement detected or implied. Applying explicit SSL: { rejectUnauthorized: false } (Verify for production).");
    config.ssl = {
      rejectUnauthorized: false, 
    };
  } else {
    console.log("PostgreSQL Pool: No explicit SSL override. Relying on default pg behavior or connection string parameters.");
  }

  console.log("PostgreSQL Pool: Creating new pool instance.");

  const newPool = new Pool(config);

  try {
    const client = await newPool.connect();
    console.log("PostgreSQL Pool: Successfully connected to database and tested connection!");
    client.release();
    return newPool;
  } catch (err) {
    const connectionError = new Error(`Failed to connect to PostgreSQL database during pool initialization: ${(err as Error).message}`);
    console.error("***************************************************************************");
    console.error("CRITICAL ERROR during newPool.connect():", connectionError.message);
    console.error("Original error stack:", (err as Error).stack);
    console.error("Database connection string used (masked):", maskedConnectionString);
    console.error("SSL Configuration used:", config.ssl ? JSON.stringify(config.ssl) : 'Default/None');
    console.error("Verify POSTGRES_URL, network/firewall settings, and database server status.");
    console.error("Pooler connections (Supabase/Neon) typically use port 6543.");
    console.error("***************************************************************************");
    poolInitializationError = connectionError;
    try {
      await newPool.end().catch(cleanupErr => console.error("PostgreSQL Pool: Error during pool cleanup after connection failure:", cleanupErr));
    } catch (cleanupErr) {
      console.error("PostgreSQL Pool: Exception during pool cleanup attempt after connection failure:", cleanupErr);
    }
    throw connectionError;
  }
}

export async function getPool(): Promise<Pool> {
  if (poolInitializationError) {
    console.error("PostgreSQL Pool (getPool): Persistent initialization error. Throwing stored error:", poolInitializationError.message);
    throw poolInitializationError;
  }
  if (!pool) {
    try {
      pool = await initializePool();
      pool.on('error', (err, client) => {
        console.error('PostgreSQL Pool (getPool): Unexpected error on idle client. Pool will be reset.', err);
        poolInitializationError = err; 
        pool = null; 
      });
    } catch (err) {
      console.error("PostgreSQL Pool (getPool): Error during initializePool call:", (err as Error).message);
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
      console.log("PostgreSQL Pool: Explicitly closed.");
    } catch(err) {
      console.error("PostgreSQL Pool: Error closing database pool:", err);
    } finally {
      pool = null;
      poolInitializationError = null;
    }
  }
}

export async function ensureDbConnected() {
  console.log("PostgreSQL Pool (ensureDbConnected): Starting database connection health check...");
  try {
    const currentPool = await getPool();
    const client = await currentPool.connect();
    await client.query('SELECT NOW()'); 
    client.release();
    console.log("PostgreSQL Pool (ensureDbConnected): Database connection health check successful.");
    return true;
  } catch (error) {
    console.error("PostgreSQL Pool (ensureDbConnected): Database connection health check FAILED. Error:", (error as Error).message);
    return false;
  }
}
