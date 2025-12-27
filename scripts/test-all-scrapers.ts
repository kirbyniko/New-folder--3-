/**
 * Comprehensive Scraper Health Check
 * 
 * Tests all 50 state scrapers and their local components to identify:
 * - Missing level fields
 * - Incorrect level values
 * - Scrapers that crash or timeout
 * - States with 0 events
 */

import { initializeScrapers, ScraperRegistry } from '../lib/functions/utils/scrapers/index.js';

const ALL_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

interface HealthCheckResult {
  state: string;
  status: 'success' | 'error' | 'timeout' | 'no-events';
  totalEvents: number;
  stateEvents: number;
  localEvents: number;
  invalidLevel: number;  // Events with level !== 'state' and level !== 'local'
  missingLevel: number;  // Events with no level field
  error?: string;
  duration: number;
}

async function testScraper(stateCode: string, timeout: number = 60000): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const scraper = ScraperRegistry.get(stateCode);
    if (!scraper) {
      return {
        state: stateCode,
        status: 'error',
        totalEvents: 0,
        stateEvents: 0,
        localEvents: 0,
        invalidLevel: 0,
        missingLevel: 0,
        error: 'Scraper not found in registry',
        duration: Date.now() - startTime
      };
    }
    
    // Run scraper with timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), timeout)
    );
    
    const events = await Promise.race([
      scraper.scrape(),
      timeoutPromise
    ]) as any[];
    
    // Analyze events
    const stateEvents = events.filter(e => e.level === 'state');
    const localEvents = events.filter(e => e.level === 'local');
    const invalidLevel = events.filter(e => e.level && e.level !== 'state' && e.level !== 'local');
    const missingLevel = events.filter(e => !e.level);
    
    let status: 'success' | 'no-events' = 'success';
    if (events.length === 0) {
      status = 'no-events';
    }
    
    return {
      state: stateCode,
      status,
      totalEvents: events.length,
      stateEvents: stateEvents.length,
      localEvents: localEvents.length,
      invalidLevel: invalidLevel.length,
      missingLevel: missingLevel.length,
      duration: Date.now() - startTime
    };
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const isTimeout = error.message === 'Timeout' || duration >= timeout;
    
    return {
      state: stateCode,
      status: isTimeout ? 'timeout' : 'error',
      totalEvents: 0,
      stateEvents: 0,
      localEvents: 0,
      invalidLevel: 0,
      missingLevel: 0,
      error: error.message,
      duration
    };
  }
}

async function main() {
  console.log('🏥 SCRAPER HEALTH CHECK\n');
  console.log('Initializing scrapers...\n');
  
  await initializeScrapers();
  
  console.log(`Testing ${ALL_STATES.length} state scrapers...\n`);
  console.log('This will take 5-10 minutes. Be patient.\n');
  
  const results: HealthCheckResult[] = [];
  
  // Test in batches of 5
  const batchSize = 5;
  for (let i = 0; i < ALL_STATES.length; i += batchSize) {
    const batch = ALL_STATES.slice(i, i + batchSize);
    console.log(`\n📊 Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(ALL_STATES.length / batchSize)}: Testing ${batch.join(', ')}...`);
    
    const batchResults = await Promise.all(
      batch.map(state => testScraper(state))
    );
    
    results.push(...batchResults);
    
    // Show quick summary
    batchResults.forEach(r => {
      const icon = r.status === 'success' ? '✅' : 
                   r.status === 'no-events' ? '⚠️' : 
                   r.status === 'timeout' ? '⏱️' : '❌';
      console.log(`  ${icon} ${r.state}: ${r.totalEvents} events (${r.stateEvents}S/${r.localEvents}L) - ${(r.duration/1000).toFixed(1)}s`);
    });
  }
  
  // Generate comprehensive report
  console.log('\n\n' + '='.repeat(80));
  console.log('FINAL HEALTH CHECK REPORT');
  console.log('='.repeat(80) + '\n');
  
  const successful = results.filter(r => r.status === 'success');
  const noEvents = results.filter(r => r.status === 'no-events');
  const timeouts = results.filter(r => r.status === 'timeout');
  const errors = results.filter(r => r.status === 'error');
  
  console.log(`📈 Overall Statistics:`);
  console.log(`  ✅ Successful: ${successful.length}`);
  console.log(`  ⚠️  No Events: ${noEvents.length}`);
  console.log(`  ⏱️  Timeouts: ${timeouts.length}`);
  console.log(`  ❌ Errors: ${errors.length}`);
  console.log(`  📊 Total Events: ${results.reduce((sum, r) => sum + r.totalEvents, 0)}`);
  
  // Level field issues
  const invalidLevelCount = results.reduce((sum, r) => sum + r.invalidLevel, 0);
  const missingLevelCount = results.reduce((sum, r) => sum + r.missingLevel, 0);
  
  if (invalidLevelCount > 0 || missingLevelCount > 0) {
    console.log(`\n🚨 LEVEL FIELD ISSUES:`);
    console.log(`  Invalid level values: ${invalidLevelCount}`);
    console.log(`  Missing level field: ${missingLevelCount}`);
    
    results.filter(r => r.invalidLevel > 0 || r.missingLevel > 0).forEach(r => {
      console.log(`    ${r.state}: ${r.invalidLevel} invalid, ${r.missingLevel} missing`);
    });
  } else {
    console.log(`\n✅ All events have valid level fields (state/local)`);
  }
  
  // States with local events
  const statesWithLocal = results.filter(r => r.localEvents > 0);
  console.log(`\n🏙️  States with local events: ${statesWithLocal.length}`);
  statesWithLocal.forEach(r => {
    console.log(`  ${r.state}: ${r.localEvents} local events`);
  });
  
  // No events (potential issues)
  if (noEvents.length > 0) {
    console.log(`\n⚠️  States with no events (${noEvents.length}):`);
    noEvents.forEach(r => {
      console.log(`  ${r.state}: ${r.error || 'No upcoming meetings'}`);
    });
  }
  
  // Timeouts (need optimization)
  if (timeouts.length > 0) {
    console.log(`\n⏱️  Scrapers timing out (${timeouts.length}):`);
    timeouts.forEach(r => {
      console.log(`  ${r.state}: ${r.error}`);
    });
  }
  
  // Errors (need fixes)
  if (errors.length > 0) {
    console.log(`\n❌ Scrapers with errors (${errors.length}):`);
    errors.forEach(r => {
      console.log(`  ${r.state}: ${r.error}`);
    });
  }
  
  // Performance insights
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  const slowest = [...results].sort((a, b) => b.duration - a.duration).slice(0, 5);
  
  console.log(`\n⚡ Performance:`);
  console.log(`  Average: ${(avgDuration/1000).toFixed(1)}s`);
  console.log(`  Slowest 5:`);
  slowest.forEach(r => {
    console.log(`    ${r.state}: ${(r.duration/1000).toFixed(1)}s (${r.totalEvents} events)`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('Health check complete!');
  console.log('='.repeat(80) + '\n');
}

main().catch(console.error);
