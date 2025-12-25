import { neon } from '@neondatabase/serverless';
import { writeFileSync } from 'fs';

const sql = neon(process.env.DATABASE_URL!);

let output = '-- Data export from Neon PostgreSQL to D1\n\n';

// Export events
console.log('📦 Exporting events...');
const events = await sql`SELECT * FROM events WHERE date >= CURRENT_DATE ORDER BY date`;
console.log(`  Found ${events.length} upcoming events`);

for (const event of events) {
  const values = [
    event.id,
    event.level,
    event.type,
    event.state_code,
    event.name,
    event.date,
    event.time,
    event.location_name,
    event.location_address,
    event.lat,
    event.lng,
    event.description,
    event.committee_name,
    event.details_url,
    event.docket_url,
    event.virtual_meeting_url,
    event.source_url,
    event.allows_public_participation ? 1 : 0,
    event.scraped_at,
    event.last_updated,
    event.scraper_source,
    event.external_id,
    event.fingerprint
  ].map(v => v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
  
  output += `INSERT INTO events VALUES (${values.join(', ')});\n`;
}

// Export bills
console.log('📦 Exporting bills...');
const bills = await sql`SELECT * FROM bills`;
console.log(`  Found ${bills.length} bills`);

for (const bill of bills) {
  const values = [
    bill.id,
    bill.state_code,
    bill.bill_number,
    bill.title,
    bill.summary,
    bill.url,
    bill.status,
    bill.introduced_date,
    bill.last_action_date,
    bill.last_action_description,
    bill.content_hash,
    bill.last_summarized_at,
    bill.description
  ].map(v => v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
  
  output += `INSERT INTO bills VALUES (${values.join(', ')});\n`;
}

// Export event_bills
console.log('📦 Exporting event_bills linkages...');
const eventBills = await sql`SELECT * FROM event_bills`;
console.log(`  Found ${eventBills.length} linkages`);

for (const link of eventBills) {
  output += `INSERT INTO event_bills VALUES ('${link.event_id}', '${link.bill_id}');\n`;
}

// Export event_tags
console.log('📦 Exporting event_tags...');
const eventTags = await sql`SELECT * FROM event_tags`;
console.log(`  Found ${eventTags.length} tags`);

for (const tag of eventTags) {
  const tagValue = String(tag.tag).replace(/'/g, "''");
  output += `INSERT INTO event_tags VALUES ('${tag.event_id}', '${tagValue}');\n`;
}

// Export states
console.log('📦 Exporting states...');
const states = await sql`SELECT * FROM states`;
console.log(`  Found ${states.length} states`);

for (const state of states) {
  const values = [
    state.code,
    state.name,
    state.capitol_lat,
    state.capitol_lng,
    state.capitol_city,
    state.jurisdiction_id,
    state.legislature_url
  ].map(v => v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
  
  output += `INSERT INTO states VALUES (${values.join(', ')});\n`;
}

// Write to file
writeFileSync('database/d1-data.sql', output);
console.log('\n✅ Data exported to database/d1-data.sql');
console.log(`📊 Total: ${events.length} events, ${bills.length} bills, ${eventBills.length} linkages, ${eventTags.length} tags, ${states.length} states`);
