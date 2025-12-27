#!/usr/bin/env tsx
/**
 * Enhanced Virginia bill scraper with OpenStates API integration
 * Fetches bill details (title, sponsors, status) from OpenStates
 */

import { VirginiaScraper } from '../lib/functions/utils/scrapers/states/virginia';
import { writeFileSync } from 'fs';

async function fetchBillDetails(billId: string): Promise<any> {
  const apiKey = process.env.VITE_OPENSTATES_API_KEY;
  if (!apiKey) {
    console.warn('⚠️  No OpenStates API key, skipping bill details');
    return null;
  }

  try {
    // Extract bill type and number from ID like "SB 2"
    const [billType, billNumber] = billId.split(' ');
    const session = '2026'; // Virginia 2026 session
    
    // Search for bill in OpenStates
    const url = `https://v3.openstates.org/bills?jurisdiction=ocd-jurisdiction/country:us/state:va/government&session=${session}&identifier=${billType}${billNumber}`;
    
    console.log(`🔍 Fetching details for ${billId}...`);
    const response = await fetch(url, {
      headers: { 'X-API-KEY': apiKey }
    });
    
    if (!response.ok) {
      console.warn(`⚠️  OpenStates returned ${response.status} for ${billId}`);
      return null;
    }
    
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      const bill = data.results[0];
      console.log(`✅ Found ${billId}: ${bill.title}`);
      return {
        title: bill.title,
        sponsors: bill.sponsorships?.map((s: any) => s.name) || [],
        status: bill.latest_action_description || 'In Committee'
      };
    }
    
    console.warn(`⚠️  No OpenStates data for ${billId}`);
    return null;
    
  } catch (error) {
    console.error(`❌ Failed to fetch ${billId}:`, error);
    return null;
  }
}

async function main() {
  console.log('🏛️ Virginia Enhanced Scraper - With Bill Details');
  console.log('=================================================\n');
  
  const scraper = new VirginiaScraper();
  
  try {
    console.log('🚀 Starting scrape...');
    const events = await scraper.scrape();
    
    console.log(`\n✅ Scrape completed!`);
    console.log(`📊 Total events: ${events.length}`);
    
    // Enhance bills with OpenStates data
    console.log('\n📋 Enhancing bill information from OpenStates...\n');
    
    for (const event of events) {
      if (event.bills && event.bills.length > 0) {
        for (const bill of event.bills) {
          const details = await fetchBillDetails(bill.id);
          if (details) {
            bill.title = details.title;
            bill.sponsors = details.sponsors;
            bill.status = details.status;
          }
          // Rate limit: wait 500ms between requests
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
    
    const eventsWithBills = events.filter(e => e.bills && e.bills.length > 0);
    const totalBills = events.reduce((sum, e) => sum + (e.bills?.length || 0), 0);
    const billsWithDetails = events.reduce((sum, e) => 
      sum + (e.bills?.filter(b => b.sponsors && b.sponsors.length > 0).length || 0), 0
    );
    
    console.log(`\n📊 Final Statistics:`);
    console.log(`   Events with bills: ${eventsWithBills.length}`);
    console.log(`   Total bills: ${totalBills}`);
    console.log(`   Bills with enhanced details: ${billsWithDetails}`);
    
    // Save to public folder
    const output = {
      state: 'VA',
      events,
      count: events.length,
      billsCount: totalBills,
      source: 'manual-scrape-enhanced',
      lastUpdated: new Date().toISOString()
    };
    
    const outputPath = './public/data/virginia-events.json';
    writeFileSync(outputPath, JSON.stringify(output, null, 2));
    
    console.log(`\n💾 Data saved to: ${outputPath}`);
    console.log(`\n🎉 Done! Virginia events with enhanced bill data available.`);
    
  } catch (error) {
    console.error('\n❌ Scrape failed:', error);
    process.exit(1);
  }
}

main();
