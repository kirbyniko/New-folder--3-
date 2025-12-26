/**
 * Scrape Mesa, Arizona Legistar events and insert into D1
 */

import { execSync } from 'child_process';
import crypto from 'crypto';
import { writeFileSync, unlinkSync } from 'fs';

interface LegistarEvent {
  EventId: number;
  EventBodyName: string;
  EventDate: string;
  EventTime: string;
  EventLocation: string;
  EventAgendaFile?: string;
  EventMinutesFile?: string;
  EventAgendaStatusName?: string;
  EventInSiteURL?: string;
}

async function fetchMesaEvents(): Promise<LegistarEvent[]> {
  try {
    const today = new Date().toISOString();
    const url = `https://webapi.legistar.com/v1/mesa/events?$filter=EventDate ge datetime'${today}'`;
    
    console.log('🔍 Fetching Mesa events...');
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      console.error(`❌ Error: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const events = await response.json();
    return Array.isArray(events) ? events : [];
  } catch (error: any) {
    console.error('❌ Fetch error:', error.message);
    return [];
  }
}

function createEventId(city: string, eventId: number): string {
  return crypto.createHash('sha256').update(`legistar-${city}-${eventId}`).digest('hex').substring(0, 16);
}

async function scrapeMesa() {
  console.log('🌵 Scraping Mesa, Arizona\n');
  
  const events = await fetchMesaEvents();
  console.log(`   Found ${events.length} total events`);
  
  if (events.length === 0) {
    console.log('⚠️  No events found');
    return;
  }
  
  // Show stats
  const eventsWithAgendas = events.filter(e => e.EventAgendaFile && e.EventAgendaFile.trim() !== '');
  console.log(`   📄 ${eventsWithAgendas.length} have agenda PDFs`);
  console.log(`   📅 Inserting all ${events.length} events\n`);
  
  // Show sample events
  console.log('📋 Sample events:');
  events.slice(0, 5).forEach((event, i) => {
    const date = new Date(event.EventDate).toISOString().split('T')[0];
    console.log(`  ${i + 1}. ${event.EventBodyName} - ${date}`);
    if (event.EventAgendaFile) {
      console.log(`     📄 ${event.EventAgendaFile.substring(0, 60)}...`);
    }
  });
  
  console.log(`\n💾 Inserting ${events.length} events into D1...\n`);
  
  const sqlStatements: string[] = [];
  
  for (const event of events) {
    const eventId = createEventId('mesa', event.EventId);
    const eventDate = new Date(event.EventDate).toISOString().split('T')[0];
    const eventTime = event.EventTime || null;
    const name = event.EventBodyName.replace(/'/g, "''");
    const locationName = (event.EventLocation || '').replace(/'/g, "''");
    const agendaUrl = event.EventAgendaFile ? event.EventAgendaFile.replace(/'/g, "''") : null;
    const detailsUrl = event.EventInSiteURL ? event.EventInSiteURL.replace(/'/g, "''") : null;
    
    // Better description based on what's available
    let description = 'Mesa City Council meeting';
    if (agendaUrl) {
      description += ' with agenda';
    } else {
      description += ' (sourced from Legistar API, no agenda link available)';
    }
    description = description.replace(/'/g, "''");
    
    const sql = `
INSERT OR REPLACE INTO events (
  id, level, name, date, time, location_name, type,
  state_code, lat, lng, description, ${agendaUrl ? 'docket_url,' : ''} ${detailsUrl ? 'details_url,' : ''}
  scraper_source, external_id
) VALUES (
  '${eventId}',
  'city',
  '${name}',
  '${eventDate}',
  ${eventTime ? `'${eventTime}'` : 'NULL'},
  '${locationName}',
  'City Council Meeting',
  'AZ',
  33.4152,
  -111.8315,
  '${description}',
  ${agendaUrl ? `'${agendaUrl}',` : ''}
  ${detailsUrl ? `'${detailsUrl}',` : ''}
  'scraper-legistar-mesa',
  '${event.EventId}'
);`;
    
    sqlStatements.push(sql);
  }
  
  // Write to temp file and execute
  const tempFile = 'temp-mesa-events.sql';
  writeFileSync(tempFile, sqlStatements.join('\n'), 'utf-8');
  
  try {
    execSync(`wrangler d1 execute civitracker-db --remote --file=${tempFile}`, { 
      stdio: 'inherit'
    });
    console.log(`\n✅ Mesa: Inserted ${events.length} events`);
  } catch (error: any) {
    console.error('❌ Error inserting events:', error.message);
  } finally {
    unlinkSync(tempFile);
  }
  
  // Verify
  console.log('\n📊 Verifying database...');
  const result = execSync(
    'wrangler d1 execute civitracker-db --remote --json --command "SELECT COUNT(*) as count FROM events WHERE state_code = \'AZ\' AND scraper_source LIKE \'%mesa%\'"',
    { encoding: 'utf-8' }
  );
  
  const parsed = JSON.parse(result);
  const count = parsed[0]?.results?.[0]?.count || 0;
  console.log(`Total Mesa events in database: ${count}`);
}

scrapeMesa().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
