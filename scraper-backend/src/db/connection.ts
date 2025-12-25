/**
 * Database Connection Manager
 * 
 * Manages PostgreSQL connection pool for scraper backend
 */

import pkg from 'pg';
const { Pool } = pkg;

let pool: pkg.Pool | null = null;

export function getPool(): pkg.Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: process.env.POSTGRES_SSL === 'true' ? {
        rejectUnauthorized: false
      } : false
    });

    pool.on('error', (err) => {
      console.error('❌ Unexpected database error:', err);
    });
  }

  return pool;
}

export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connected:', result.rows[0].now);
    return true;
  } catch (error: any) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

export async function closeDatabaseConnection(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('✅ Database connection closed');
  }
}
