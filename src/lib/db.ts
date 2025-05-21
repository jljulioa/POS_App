// src/lib/db.ts
import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool() {
  if (!pool) {
    if (!process.env.POSTGRES_URL) {
      throw new Error("POSTGRES_URL environment variable is not set.");
    }
    pool = new Pool({
      connectionString: process.env.POSTGRES_URL,
      // ssl: {
      //   rejectUnauthorized: false // Necessary for some cloud providers like Neon if not using full certs
      // } // Neon typically handles SSL via the connection string with sslmode=require
    });

    pool.on('error', (err, client) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }
  return pool;
}

export async function query(sql: string, params?: any[]) {
  const currentPool = getPool();
  try {
    const results = await currentPool.query(sql, params);
    return results.rows; // pg returns results in a `rows` property
  } catch (error) {
    console.error("Database query error:", error);
    throw new Error("An error occurred while querying the database.");
  }
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log("Database pool closed.");
  }
}
