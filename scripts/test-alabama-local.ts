import { scrapeMontgomeryMeetings } from '../netlify/functions/utils/scrapers/local/montgomery.js';
import { scrapeBirminghamMeetings } from '../netlify/functions/utils/scrapers/local/birmingham.js';

console.log('🧪 Testing Alabama local scrapers...\n');

console.log('=== MONTGOMERY ===');
try {
  const montgomeryEvents = await scrapeMontgomeryMeetings();
  console.log(`✅ Found ${montgomeryEvents.length} Montgomery events`);
  if (montgomeryEvents.length > 0) {
    console.log('\nSample event:');
    console.log(JSON.stringify(montgomeryEvents[0], null, 2));
  }
} catch (error) {
  console.error('❌ Montgomery scraper failed:', error);
}

console.log('\n=== BIRMINGHAM ===');
try {
  const birminghamEvents = await scrapeBirminghamMeetings();
  console.log(`✅ Found ${birminghamEvents.length} Birmingham events`);
  if (birminghamEvents.length > 0) {
    console.log('\nSample event:');
    console.log(JSON.stringify(birminghamEvents[0], null, 2));
  }
} catch (error) {
  console.error('❌ Birmingham scraper failed:', error);
}
