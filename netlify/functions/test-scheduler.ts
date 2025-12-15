/**
 * Manual test runner for scheduled scraper
 * Run this to test scraping without waiting for scheduled execution
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Import handlers
import { handler as congressHandler } from './congress-meetings';
import { handler as stateHandler } from './state-events';

async function testScheduledScraper() {
  const timestamp = new Date().toISOString();
  console.log(`\n🚀 Starting manual scrape test at ${timestamp}\n`);
  
  const results: any = {
    lastUpdated: timestamp,
    congress: null,
    states: {},
    successCount: 0,
    errorCount: 0,
    errors: []
  };

  try {
    // 1. Scrape Congress meetings
    console.log('📊 Scraping Congress meetings...');
    try {
      const congressResponse = await congressHandler({} as any, {} as any);
      if (congressResponse.statusCode === 200) {
        results.congress = JSON.parse(congressResponse.body);
        results.successCount++;
        console.log(`✅ Congress: ${results.congress.events?.length || 0} events found\n`);
      } else {
        throw new Error(`Status ${congressResponse.statusCode}`);
      }
    } catch (error: any) {
      console.error('❌ Congress scrape failed:', error.message, '\n');
      results.errorCount++;
      results.errors.push({ source: 'congress', error: error.message });
    }

    // 2. Test with a few states first (not all 51)
    const testStates = ['CA', 'NY', 'MI', 'TX', 'FL'];
    
    console.log(`🗺️  Testing ${testStates.length} states...\n`);
    
    for (const state of testStates) {
      try {
        console.log(`  Scraping ${state}...`);
        const stateResponse = await stateHandler({
          queryStringParameters: { state }
        } as any, {} as any);
        
        if (stateResponse.statusCode === 200) {
          results.states[state] = JSON.parse(stateResponse.body);
          results.successCount++;
          console.log(`  ✅ ${state}: ${results.states[state].events?.length || 0} events`);
        } else {
          throw new Error(`Status ${stateResponse.statusCode}`);
        }
      } catch (error: any) {
        console.error(`  ❌ ${state}: ${error.message}`);
        results.errorCount++;
        results.errors.push({ source: state, error: error.message });
        
        // Save empty result
        results.states[state] = {
          state,
          events: [],
          source: 'error',
          error: error.message,
          lastUpdated: timestamp
        };
      }
      
      // Small delay between states
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n💾 Saving results to cache...\n');

    // 3. Ensure cache directory exists
    const cacheDir = join(process.cwd(), 'public', 'cache');
    if (!existsSync(cacheDir)) {
      await mkdir(cacheDir, { recursive: true });
    }
    
    // Save congress data with metadata
    if (results.congress) {
      const congressPath = join(cacheDir, 'congress.json');
      const congressData = Array.isArray(results.congress) ? results.congress : results.congress.events || [];
      await writeFile(congressPath, JSON.stringify({
        events: congressData,
        lastUpdated: timestamp,
        source: 'congress-api'
      }, null, 2));
      console.log(`✅ Saved: congress.json (${congressData.length} events)`);
    }

    // Save each state with metadata
    for (const [state, data] of Object.entries(results.states)) {
      const statePath = join(cacheDir, `state-${state.toLowerCase()}.json`);
      const stateEvents = Array.isArray(data) ? data : (data as any).events || [];
      await writeFile(statePath, JSON.stringify({
        events: stateEvents,
        state,
        lastUpdated: timestamp,
        source: (data as any).source || 'custom-scraper'
      }, null, 2));
      console.log(`✅ Saved: state-${state.toLowerCase()}.json (${stateEvents.length} events)`);
    }

    // Save index/metadata
    const indexPath = join(cacheDir, 'index.json');
    await writeFile(
      indexPath,
      JSON.stringify({
        lastUpdated: timestamp,
        successCount: results.successCount,
        errorCount: results.errorCount,
        errors: results.errors,
        availableStates: Object.keys(results.states),
        testedStates: testStates
      }, null, 2)
    );
    console.log('✅ Saved: index.json\n');

    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Test Complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Success: ${results.successCount}
   Errors:  ${results.errorCount}
   Timestamp: ${timestamp}
   
   Cache saved to: public/cache/
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    if (results.errors.length > 0) {
      console.log('⚠️  Errors encountered:');
      results.errors.forEach((err: any) => {
        console.log(`   - ${err.source}: ${err.error}`);
      });
      console.log('');
    }

  } catch (error: any) {
    console.error('\n❌ Fatal error in test scraper:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testScheduledScraper().catch(console.error);
