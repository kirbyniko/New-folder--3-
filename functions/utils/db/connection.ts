import { neon, neonConfig } from '@neondatabase/serverless';

// Enable fetch mode for Cloudflare Workers
neonConfig.fetchConnectionCache = true;

export interface DbConfig {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  connectionString?: string;
}

// Get SQL query function for Cloudflare Workers (uses HTTP fetch, not WebSocket)
// In Cloudflare Pages, env vars come from context.env, not process.env
export function getSQL(env?: any) {
  // Try context.env first (Cloudflare Pages), then process.env (local)
  const connectionString = env?.DATABASE_URL || process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  return neon(connectionString);
}

// Health check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const sql = getSQL();
    const result = await sql`SELECT NOW()`;
    console.log('✅ Database connection successful:', result[0]);
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    return false;
  }
}
