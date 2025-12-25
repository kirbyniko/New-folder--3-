import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

const results = await sql`
  SELECT 
    state_code, 
    COUNT(*) as events_with_docket 
  FROM events 
  WHERE docket_url IS NOT NULL 
  AND docket_url != '' 
  GROUP BY state_code 
  ORDER BY events_with_docket DESC
`;

console.log('States with docket URLs:');
results.forEach((r: any) => {
  console.log(`  ${r.state_code}: ${r.events_with_docket} events`);
});

console.log(`\nTotal: ${results.length} states have events with agenda PDFs`);
