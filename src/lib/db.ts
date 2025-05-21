// src/lib/db.ts
import mysql from 'mysql2/promise';

// Create a connection pool
// The pool will use the MARIADB_URL from your .env.local file by default if no explicit config is passed
// For more robust error handling and specific configurations, you can expand this.
let pool: mysql.Pool | null = null;

function getPool() {
  if (!pool) {
    if (!process.env.MARIADB_URL) {
      throw new Error("MARIADB_URL environment variable is not set.");
    }
    pool = mysql.createPool(process.env.MARIADB_URL);
  }
  return pool;
}

export async function query(sql: string, params?: any[]) {
  const currentPool = getPool();
  try {
    const [results] = await currentPool.execute(sql, params);
    return results;
  } catch (error) {
    console.error("Database query error:", error);
    // In a real app, you might want to throw a more specific error
    // or handle different types of DB errors differently.
    throw new Error("An error occurred while querying the database.");
  }
}

// Optional: A function to gracefully close the pool when the app shuts down
// This is more relevant for standalone Node.js apps than Next.js serverless functions usually,
// but good to be aware of.
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log("Database pool closed.");
  }
}
