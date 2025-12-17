import { OklahomaScraper } from './netlify/functions/utils/scrapers/states/oklahoma';
import { closeBrowser } from './netlify/functions/utils/scrapers/puppeteer-helper';
import * as fs from 'fs';

async function regenerateOklahomaJSON() {
  try {
    const scraper = new OklahomaScraper();
    const events = await scraper.scrapeCalendar();
    
    const billsCount = events.reduce((sum, e) => sum + (e.bills?.length || 0), 0);
    
    const data = {
      count: events.length,
      billsCount,
      lastUpdated: new Date().toISOString(),
      events
    };
    
    fs.writeFileSync('public/data/oklahoma-events.json', JSON.stringify(data, null, 2));
    
    console.log('\nUpdated oklahoma-events.json with', events.length, 'events');
    console.log('Total bills:', billsCount);
    console.log('\nSample event:');
    console.log(JSON.stringify(events[0], null, 2));
    
    // Close browser
    await closeBrowser();
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

regenerateOklahomaJSON();
