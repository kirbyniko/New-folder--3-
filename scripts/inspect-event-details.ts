import { loadEnvFile } from '../netlify/functions/utils/env-loader.js';

loadEnvFile();

const OPENSTATES_API = 'https://v3.openstates.org';
const JURISDICTION_ID = 'ocd-jurisdiction/country:us/state:al/government';
const API_KEY = process.env.OPENSTATES_API_KEY;

console.log('Fetching full OpenStates event details...\n');

const encodedJurisdiction = encodeURIComponent(JURISDICTION_ID);
const url = `${OPENSTATES_API}/events?jurisdiction=${encodedJurisdiction}&per_page=20`;

const response = await fetch(url, {
  headers: {
    'X-API-KEY': API_KEY!,
    'User-Agent': 'Civitron/1.0 (Legislative Events Aggregator)'
  }
});

const data = await response.json();

// Look at the first upcoming event in detail
const firstEvent = data.results.find((e: any) => new Date(e.start_date) > new Date());

console.log('=== FULL EVENT OBJECT ===\n');
console.log(JSON.stringify(firstEvent, null, 2));

// Extract any URLs from description
if (firstEvent.description) {
  console.log('\n=== DESCRIPTION ===');
  console.log(firstEvent.description);
  
  // Look for URLs in description
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const urls = firstEvent.description.match(urlPattern);
  if (urls) {
    console.log('\n📎 URLs found in description:');
    urls.forEach((url: string) => console.log(`  - ${url}`));
  }
}
