import { LEGISTAR_CITIES } from './lib/functions/utils/legistar-cities.js';

const azCities = LEGISTAR_CITIES.filter(city => city.state === 'AZ');

console.log('Arizona Legistar Cities:', azCities.length);
console.log('\nTesting each city:\n');

for (const city of azCities) {
  const today = new Date().toISOString().split('T')[0];
  const url = `https://webapi.legistar.com/v1/${city.client}/events?$filter=EventDate ge datetime'${today}'`;
  
  console.log(`\n${city.name} (client: ${city.client})`);
  console.log(`URL: ${url}`);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const events = await response.json();
      console.log(`✅ SUCCESS - ${events.length} events found`);
      if (events.length > 0) {
        console.log(`   Sample: ${events[0].EventBodyName} - ${events[0].EventDate}`);
      }
    } else {
      console.log(`❌ HTTP ${response.status} - ${response.statusText}`);
    }
  } catch (error: any) {
    console.log(`❌ ERROR: ${error.message}`);
  }
}
