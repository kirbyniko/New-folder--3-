/**
 * Test local-meetings endpoint simulation
 * Simulates what happens when frontend calls the endpoint
 */

import { findNearbyCities } from './utils/legistar-cities';
import { scrapeBirminghamMeetings } from './utils/scrapers/local/birmingham';
import { scrapeMontgomeryMeetings } from './utils/scrapers/local/montgomery';
import { sanitizeEvent } from './utils/security';
import { closeBrowser } from './utils/scrapers/puppeteer-helper';

async function simulateLocalMeetingsEndpoint() {
  console.log('\n🧪 Simulating local-meetings Endpoint for Alabama\n');
  
  // Montgomery, AL coordinates
  const lat = 32.3792;
  const lng = -86.3077;
  const radius = 50;
  
  console.log(`📍 Coordinates: ${lat}, ${lng}`);
  console.log(`📏 Radius: ${radius} miles\n`);
  
  try {
    // Step 1: Find nearby Legistar cities
    console.log('1️⃣ Checking for Legistar cities...');
    let nearbyCities = findNearbyCities(lat, lng, radius);
    console.log(`   Found ${nearbyCities.length} Legistar cities`);
    
    // Step 2: Check Alabama detection
    console.log('\n2️⃣ Checking Alabama detection...');
    const isAlabama = (lat >= 30.2 && lat <= 35.0) && (lng >= -88.5 && lng <= -84.9);
    console.log(`   Is Alabama: ${isAlabama}`);
    
    if (isAlabama) {
      // Add Birmingham
      const hasBirmingham = nearbyCities.some(c => c.client === 'birmingham');
      if (!hasBirmingham) {
        console.log('   ✅ Adding Birmingham');
        nearbyCities.push({
          name: 'Birmingham',
          client: 'birmingham',
          state: 'AL',
          lat: 33.5186,
          lng: -86.8104,
          population: 200733
        });
      }
      
      // Add Montgomery
      const hasMontgomery = nearbyCities.some(c => c.client === 'montgomery');
      if (!hasMontgomery) {
        console.log('   ✅ Adding Montgomery');
        nearbyCities.push({
          name: 'Montgomery',
          client: 'montgomery',
          state: 'AL',
          lat: 32.3792,
          lng: -86.3077,
          population: 200603
        });
      }
    }
    
    console.log(`\n   Total cities to scrape: ${nearbyCities.length}`);
    nearbyCities.forEach(c => console.log(`      - ${c.name} (${c.client})`));
    
    // Step 3: Scrape Birmingham
    console.log('\n3️⃣ Scraping Birmingham...');
    const rawBirmingham = await scrapeBirminghamMeetings();
    console.log(`   Scraped ${rawBirmingham.length} raw events`);
    
    const birminghamEvents = rawBirmingham.map(evt => sanitizeEvent({
      id: evt.id,
      name: evt.name,
      date: evt.date,
      time: evt.time,
      location: evt.location,
      committee: evt.committee,
      type: evt.type,
      level: 'local' as const,
      lat: 33.5186,
      lng: -86.8104,
      zipCode: null,
      city: 'Birmingham',
      state: 'AL',
      url: evt.sourceUrl || null
    }));
    
    console.log(`   Converted to ${birminghamEvents.length} formatted events`);
    if (birminghamEvents.length > 0) {
      console.log(`   Sample:`, JSON.stringify(birminghamEvents[0], null, 2).substring(0, 300));
    }
    
    // Step 4: Scrape Montgomery
    console.log('\n4️⃣ Scraping Montgomery...');
    const rawMontgomery = await scrapeMontgomeryMeetings();
    console.log(`   Scraped ${rawMontgomery.length} raw events`);
    
    const montgomeryEvents = rawMontgomery.map(evt => sanitizeEvent({
      id: evt.id,
      name: evt.name,
      date: evt.date,
      time: evt.time,
      location: evt.location,
      committee: evt.committee,
      type: evt.type,
      level: 'local' as const,
      lat: 32.3792,
      lng: -86.3077,
      zipCode: null,
      city: 'Montgomery',
      state: 'AL',
      url: evt.sourceUrl || null
    }));
    
    console.log(`   Converted to ${montgomeryEvents.length} formatted events`);
    if (montgomeryEvents.length > 0) {
      console.log(`   Sample:`, JSON.stringify(montgomeryEvents[0], null, 2).substring(0, 300));
    }
    
    // Step 5: Combine results
    console.log('\n5️⃣ Combining results...');
    const allEvents = [...birminghamEvents, ...montgomeryEvents];
    console.log(`   Total events: ${allEvents.length}`);
    
    // Step 6: Show what would be returned
    console.log('\n6️⃣ Final API Response:');
    console.log(JSON.stringify(allEvents, null, 2));
    
    console.log(`\n✅ Endpoint would return ${allEvents.length} events\n`);
    
  } catch (error) {
    console.error('\n❌ Simulation failed:', error);
  } finally {
    await closeBrowser();
  }
}

simulateLocalMeetingsEndpoint();
