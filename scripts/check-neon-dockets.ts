import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://neondb_owner:npg_j3RuDlkJep6n@ep-frosty-dream-adlutkdw-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";

const sql = neon(DATABASE_URL);

console.log('🔍 Checking Neon database for docket URLs...\n');

// Check states with docket URLs
const states = await sql`
  SELECT state_code, COUNT(*) as events_with_docket 
  FROM events 
  WHERE docket_url IS NOT NULL AND docket_url != '' 
  GROUP BY state_code 
  ORDER BY events_with_docket DESC
`;

console.log('States with docket URLs:');
if (states.length === 0) {
  console.log('  ❌ No events with docket URLs found');
} else {
  states.forEach((r: any) => {
    console.log(`  ${r.state_code}: ${r.events_with_docket} events`);
  });
}

console.log(`\nTotal: ${states.length} states\n`);

// Get sample events with docket URLs
const samples = await sql`
  SELECT id, name, state_code, docket_url, date
  FROM events 
  WHERE docket_url IS NOT NULL AND docket_url != ''
  AND date >= CURRENT_DATE
  ORDER BY date ASC
  LIMIT 5
`;

if (samples.length > 0) {
  console.log('📄 Sample events with docket URLs:\n');
  samples.forEach((e: any) => {
    console.log(`  ${e.state_code} - ${e.name}`);
    console.log(`     Date: ${e.date}`);
    console.log(`     URL: ${e.docket_url.substring(0, 80)}...`);
    console.log();
  });
}
