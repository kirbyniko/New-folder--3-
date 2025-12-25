/**
 * Fix Legistar PDF URLs in D1
 * 
 * Updates the 54 existing Legistar events to use real PDF URLs
 * instead of the broken /AgendaFile endpoint URLs
 */

import { execSync } from 'child_process';

interface Event {
  id: string;
  name: string;
  state_code: string;
  docket_url: string;
  scraper_source: string;
  external_id: string;
}

async function getActualPdfUrl(client: string, eventId: string): Promise<string | null> {
  try {
    const response = await fetch(`https://webapi.legistar.com/v1/${client}/events/${eventId}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.EventAgendaFile || null;
  } catch (error) {
    console.error(`   ❌ Failed to fetch: ${error}`);
    return null;
  }
}

async function getLegistarEvents(): Promise<Event[]> {
  try {
    const result = execSync(
      `wrangler d1 execute civitracker-db --remote --command "SELECT id, name, state_code, docket_url, scraper_source, external_id FROM events WHERE scraper_source LIKE 'scraper-legistar-%' AND docket_url IS NOT NULL" --json`,
      { encoding: 'utf-8' }
    );
    const parsed = JSON.parse(result);
    return parsed[0]?.results || [];
  } catch (error: any) {
    console.error('Failed to fetch events:', error.message);
    return [];
  }
}

async function updateEventUrl(eventId: string, newUrl: string): Promise<boolean> {
  try {
    const sql = `UPDATE events SET docket_url = '${newUrl}' WHERE id = '${eventId}';`;
    execSync(`wrangler d1 execute civitracker-db --remote --command "${sql}"`, {
      stdio: 'pipe'
    });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log('🔧 Fixing Legistar PDF URLs\n');
  
  const events = await getLegistarEvents();
  console.log(`Found ${events.length} Legistar events to fix\n`);
  
  if (events.length === 0) {
    console.log('No events to fix!');
    return;
  }
  
  let fixed = 0;
  let failed = 0;
  let skipped = 0;
  
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    console.log(`[${i + 1}/${events.length}] ${event.state_code} - ${event.name.substring(0, 40)}...`);
    
    // Check if already has a real PDF URL
    if (event.docket_url.includes('legistar2.granicus.com') || 
        event.docket_url.includes('.pdf') && !event.docket_url.includes('/AgendaFile')) {
      console.log('   ✅ Already has valid PDF URL\n');
      skipped++;
      continue;
    }
    
    // Extract client from scraper_source (e.g., "scraper-legistar-seattle" → "seattle")
    const client = event.scraper_source.replace('scraper-legistar-', '');
    
    console.log(`   🔍 Fetching real PDF URL from ${client}...`);
    const realPdfUrl = await getActualPdfUrl(client, event.external_id);
    
    if (!realPdfUrl) {
      console.log('   ⚠️  No PDF found\n');
      failed++;
      continue;
    }
    
    console.log(`   📄 ${realPdfUrl.substring(0, 70)}...`);
    
    const updated = await updateEventUrl(event.id, realPdfUrl);
    if (updated) {
      console.log('   ✅ Updated!\n');
      fixed++;
    } else {
      console.log('   ❌ Failed to update\n');
      failed++;
    }
  }
  
  console.log('='.repeat(70));
  console.log('📊 RESULTS');
  console.log('='.repeat(70));
  console.log(`✅ Fixed:   ${fixed}`);
  console.log(`⚠️  Failed:  ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`\n🎉 Ready to extract agendas! Run:`);
  console.log('   npx tsx scripts/extract-all-agendas.ts\n');
}

main();
