/**
 * Scrape Legistar Cities with Agendas - Write Directly to D1
 * 
 * Legistar API returns meetings with agenda document links.
 * This script scrapes multiple cities and saves only events with agenda PDFs.
 */

import { execSync } from 'child_process';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { LEGISTAR_CITIES, type LegistarCity } from '../lib/functions/utils/legistar-cities.js';

// Top cities most likely to have agendas
const PRIORITY_CITIES = [
  'chicago', 'boston', 'baltimore', 'seattle', 'denver',
  'phoenix', 'portland', 'austin', 'philadelphia', 'sandiego',
  'sanfrancisco', 'miami', 'atlanta', 'detroit', 'milwaukee'
];

interface LegistarEvent {
  EventId: number;
  EventBodyName: string;
  EventDate: string;
  EventTime: string;
  EventLocation: string;
  EventAgendaFile?: string;
  EventMinutesFile?: string;
  EventAgendaStatusName?: string;
}

async function fetchLegistarEvents(client: string, city: LegistarCity): Promise<LegistarEvent[]> {
  try {
    const url = `https://webapi.legistar.com/v1/${client}/events?$filter=EventDate ge datetime'${new Date().toISOString()}'`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) return [];
    const events = await response.json();
    return Array.isArray(events) ? events : [];
  } catch {
    return [];
  }
}

async function getActualPdfUrl(client: string, eventId: number): Promise<string | null> {
  try {
    const response = await fetch(`https://webapi.legistar.com/v1/${client}/events/${eventId}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.EventAgendaFile || null;
  } catch {
    return null;
  }
}

async function saveEventToD1(event: LegistarEvent, city: LegistarCity, agendaUrl: string) {
  const eventId = uuidv4();
  const fingerprint = crypto
    .createHash('sha256')
    .update(`${event.EventBodyName}|${event.EventDate}|${city.name}`)
    .digest('hex');
  
  // Parse time
  let normalizedTime = null;
  if (event.EventTime) {
    const timeMatch = event.EventTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (timeMatch) {
      let [_, hour, minute, meridiem] = timeMatch;
      let hours = parseInt(hour);
      if (meridiem?.toUpperCase() === 'PM' && hours !== 12) hours += 12;
      if (meridiem?.toUpperCase() === 'AM' && hours === 12) hours = 0;
      normalizedTime = `${hours.toString().padStart(2, '0')}:${minute}:00`;
    }
  }
  
  const sql = `
INSERT INTO events (
  id, level, state_code, name, date, time,
  lat, lng, location_name, description, committee_name,
  type, details_url, docket_url, scraper_source, external_id,
  fingerprint, last_updated
) VALUES (
  '${eventId}',
  'local',
  '${city.state}',
  '${event.EventBodyName.replace(/'/g, "''")}',
  '${event.EventDate.split('T')[0]}',
  ${normalizedTime ? `'${normalizedTime}'` : 'NULL'},
  ${city.lat},
  ${city.lng},
  ${event.EventLocation ? `'${event.EventLocation.replace(/'/g, "''").substring(0, 200)}'` : `'${city.name} City Hall'`},
  'City council meeting',
  '${event.EventBodyName.replace(/'/g, "''")}',
  'council-meeting',
  'https://webapi.legistar.com/v1/${city.client}/events/${event.EventId}',
  '${agendaUrl}',
  'scraper-legistar-${city.client}',
  '${event.EventId}',
  '${fingerprint}',
  datetime('now')
);
`.replace(/\n/g, ' ');
  
  try {
    execSync(`wrangler d1 execute civitracker-db --remote --command "${sql}"`, { 
      stdio: 'inherit' // Show all output including errors
    });
    return true;
  } catch (error: any) {
    console.error(`    ❌ Failed to insert: ${error.message}`);
    return false;
  }
}

async function scrapeCityWithAgendas(city: LegistarCity) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🏙️  ${city.name}, ${city.state} (${city.client})`);
  console.log('='.repeat(70));
  
  const events = await fetchLegistarEvents(city.client, city);
  console.log(`   Found ${events.length} total events`);
  
  // Filter to only events with agenda files
  const eventsWithAgendas = events.filter(e => e.EventAgendaFile);
  console.log(`   📄 ${eventsWithAgendas.length} have agenda PDFs\n`);
  
  if (eventsWithAgendas.length === 0) {
    return { city: city.name, inserted: 0 };
  }
  
  let inserted = 0;
  for (const event of eventsWithAgendas.slice(0, 10)) { // Limit to 10 per city
    // Fetch the actual PDF URL from the event details
    const realPdfUrl = await getActualPdfUrl(city.client, event.EventId);
    if (!realPdfUrl) {
      console.log(`   ⚠️  No PDF URL for ${event.EventBodyName}`);
      continue;
    }
    
    const saved = await saveEventToD1(event, city, realPdfUrl);
    if (saved) {
      inserted++;
      console.log(`   ✓ ${event.EventBodyName} - ${event.EventDate.split('T')[0]}`);
      console.log(`     📄 ${realPdfUrl.substring(0, 80)}...\n`);
    }
  }
  
  console.log(`✅ ${city.name}: Inserted ${inserted} events with agendas\n`);
  return { city: city.name, inserted };
}

async function main() {
  console.log('🚀 Scraping Legistar Cities with PDF Agendas\n');
  console.log(`Processing ${PRIORITY_CITIES.length} high-priority cities\n`);
  
  const cities = LEGISTAR_CITIES.filter(c => PRIORITY_CITIES.includes(c.client));
  const results: Array<{city: string, inserted: number}> = [];
  
  for (const city of cities) {
    const result = await scrapeCityWithAgendas(city);
    results.push(result);
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY');
  console.log('='.repeat(70));
  
  let totalInserted = 0;
  results.forEach(r => {
    console.log(`${r.city}: ${r.inserted} events`);
    totalInserted += r.inserted;
  });
  
  console.log(`\n✅ Total: ${totalInserted} local events with agendas added to D1`);
  console.log('\n🎉 Ready to extract agendas! Run:');
  console.log('   npx tsx scripts/extract-all-agendas.ts\n');
}

main();
