import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// Get all table names
const tables = await sql`
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  ORDER BY table_name
`;

console.log('📋 Tables in database:', tables.map(t => t.table_name).join(', '));

// Get schema for each table
for (const { table_name } of tables) {
  const columns = await sql`
    SELECT 
      column_name,
      data_type,
      character_maximum_length,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_name = ${table_name}
    ORDER BY ordinal_position
  `;
  
  console.log(`\n📊 ${table_name}:`);
  for (const col of columns) {
    console.log(`  - ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
  }
}

// Get row counts
console.log('\n📈 Row counts:');
const events = await sql`SELECT COUNT(*) as count FROM events`;
const bills = await sql`SELECT COUNT(*) as count FROM bills`;
const eventBills = await sql`SELECT COUNT(*) as count FROM event_bills`;
const eventTags = await sql`SELECT COUNT(*) as count FROM event_tags`;

console.log(`  - events: ${events[0].count}`);
console.log(`  - bills: ${bills[0].count}`);
console.log(`  - event_bills: ${eventBills[0].count}`);
console.log(`  - event_tags: ${eventTags[0].count}`);
