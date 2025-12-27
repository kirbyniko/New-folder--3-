import { scrapeJuneauMeetings } from './lib/functions/utils/scrapers/local/juneau.js';
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

async function insertJuneauEvents() {
  console.log('Scraping Juneau meetings...');
  const events = await scrapeJuneauMeetings();
  
  console.log(`\n📊 Found ${events.length} Juneau events`);
  
  if (events.length === 0) {
    console.log('No events to insert');
    return;
  }
  
  // Generate SQL
  let sql = '';
  
  for (const event of events) {
    const esc = (str: any) => str ? `'${String(str).replace(/'/g, "''")}'` : 'NULL';
    const date = new Date(event.date);
    const dateStr = date.toISOString().split('T')[0];
    
    sql += `INSERT OR REPLACE INTO events (
      id, name, date, time, location_name, committee_name, type, level,
      state_code, lat, lng, description, source_url, docket_url,
      virtual_meeting_url, scraped_at
    ) VALUES (
      ${esc(event.id)}, ${esc(event.name)}, ${esc(dateStr)}, ${esc(event.time)},
      ${esc(event.location)}, ${esc(event.committee)}, ${esc(event.type)}, 'local',
      'AK', 58.3019, -134.4197,
      ${esc(event.description)}, ${esc(event.sourceUrl)}, ${esc(event.docketUrl)},
      ${esc(event.virtualMeetingUrl)}, datetime('now')
    );\n`;
  }
  
  writeFileSync('temp-juneau-events.sql', sql);
  console.log('\n📝 Generated SQL file: temp-juneau-events.sql');
  console.log('🚀 Executing SQL via wrangler...');
  
  try {
    execSync(`wrangler d1 execute civitracker-db --remote --file=temp-juneau-events.sql`, {
      stdio: 'inherit'
    });
    console.log('\n✅ Juneau events inserted successfully!');
  } catch (error) {
    console.error('\n❌ Error executing SQL:', error);
  }
}

insertJuneauEvents().catch(console.error);
