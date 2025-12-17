import { scrapeOklahomaCityMeetings } from './netlify/functions/utils/scrapers/local/oklahoma-city';

async function test() {
  const events = await scrapeOklahomaCityMeetings();
  console.log('\n📋 First Event Details:\n');
  console.log('Name:', events[0].name);
  console.log('Description:', events[0].description);
  console.log('\n📋 Second Event Details:\n');
  console.log('Name:', events[1].name);
  console.log('Description:', events[1].description);
}

test();
