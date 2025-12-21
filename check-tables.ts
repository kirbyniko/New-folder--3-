import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

const client = new Client({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD
});

await client.connect();
const result = await client.query(`SELECT tablename FROM pg_tables WHERE schemaname='public'`);
console.log('Tables:', result.rows.map(x => x.tablename));
await client.end();
