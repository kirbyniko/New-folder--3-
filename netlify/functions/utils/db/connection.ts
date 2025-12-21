import { Pool, PoolClient } from 'pg';

let pool: Pool | null = null;

export interface DbConfig {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  connectionString?: string;
}

export function getPool(): Pool {
  if (!pool) {
    const config: DbConfig = {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'civitron',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
    };

    // Use connection string if provided, otherwise use individual params
    const connectionString = process.env.DATABASE_URL;

    pool = new Pool(
      connectionString
        ? { connectionString, max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 2000 }
        : { ...config, max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 2000 }
    );

    pool.on('error', (err) => {
      console.error('Unexpected database error:', err);
    });

    console.log('📊 PostgreSQL pool created');
  }

  return pool;
}

export async function getClient(): Promise<PoolClient> {
  const pool = getPool();
  return await pool.connect();
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('📊 PostgreSQL pool closed');
  }
}

// Health check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful:', result.rows[0]);
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    return false;
  }
}
