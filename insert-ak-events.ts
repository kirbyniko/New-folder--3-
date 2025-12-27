import { initializeScrapers, ScraperRegistry } from './lib/functions/utils/scrapers/index.js';
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

async function insertAlaskaEvents() {
  console.log('Initializing scrapers...');
  await initializeScrapers();
  
  const scraper = ScraperRegistry.get('AK');
  if (!scraper) {
    console.log('❌ No AK scraper found');
    return;
  }
  
  console.log('✅ Running Alaska scraper...');
  const events = await scraper.scrape();
  
  console.log(`\n📊 Found ${events.length} events`);
  const local = events.filter(e => e.level === 'local');
  const state = events.filter(e => e.level === 'state');
  console.log(`  - ${state.length} state-level`);
  console.log(`  - ${local.length} local-level`);
  
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
      id, name, date, time, location, committee, type, level,
      state_code, lat, lng, zip_code, description, url, docket_url,
      virtual_meeting_url, bills, tags, scraped_at
    ) VALUES (
      ${esc(event.id)}, ${esc(event.name)}, ${esc(dateStr)}, ${esc(event.time)},
      ${esc(event.location)}, ${esc(event.committee)}, ${esc(event.type)}, ${esc(event.level)},
      ${esc(event.state)}, ${event.lat}, ${event.lng}, ${esc(event.zipCode)},
      ${esc(event.description)}, ${esc(event.url)}, ${esc(event.docketUrl)},
      ${esc(event.virtualMeetingUrl)}, ${esc(event.bills ? JSON.stringify(event.bills) : null)},
      ${esc(event.tags ? JSON.stringify(event.tags) : null)}, datetime('now')
    );\n`;
  }
  
  writeFileSync('temp-ak-events.sql', sql);
  console.log('\n📝 Generated SQL file: temp-ak-events.sql');
  console.log('🚀 Executing SQL via wrangler...');
  
  try {
    execSync(`wrangler d1 execute civitracker-db --remote --file=temp-ak-events.sql`, {
      stdio: 'inherit'
    });
    console.log('\n✅ Alaska events inserted successfully!');
  } catch (error) {
    console.error('\n❌ Error executing SQL:', error);
  }
}

insertAlaskaEvents().catch(console.error);
