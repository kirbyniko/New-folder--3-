import { loadEnvFile } from '../netlify/functions/utils/env-loader.js';

loadEnvFile();

const OPENSTATES_API = 'https://v3.openstates.org';
const JURISDICTION_ID = 'ocd-jurisdiction/country:us/state:al/government';
const API_KEY = process.env.OPENSTATES_API_KEY;

console.log('Fetching Alabama events from OpenStates API to inspect URLs...\n');

const encodedJurisdiction = encodeURIComponent(JURISDICTION_ID);
const url = `${OPENSTATES_API}/events?jurisdiction=${encodedJurisdiction}&per_page=20`;

const response = await fetch(url, {
  headers: {
    'X-API-KEY': API_KEY!,
    'User-Agent': 'Civitron/1.0 (Legislative Events Aggregator)'
  }
});

const data = await response.json();

console.log(`Found ${data.results?.length || 0} events\n`);

// Inspect the first 3 events
data.results.slice(0, 3).forEach((event: any, i: number) => {
  console.log(`\n=== Event ${i + 1}: ${event.name} ===`);
  console.log(`ID: ${event.id}`);
  console.log(`Start Date: ${event.start_date}`);
  console.log(`\nSources:`);
  if (event.sources && event.sources.length > 0) {
    event.sources.forEach((source: any, j: number) => {
      console.log(`  ${j + 1}. URL: ${source.url}`);
      console.log(`     Note: ${source.note || 'N/A'}`);
    });
  } else {
    console.log('  No sources available');
  }
  
  console.log(`\nMedia:`);
  if (event.media && event.media.length > 0) {
    event.media.forEach((media: any, j: number) => {
      console.log(`  ${j + 1}. ${media.name}: ${media.links?.[0]?.url || 'N/A'}`);
    });
  } else {
    console.log('  No media available');
  }
  
  console.log(`\nDocuments:`);
  if (event.documents && event.documents.length > 0) {
    event.documents.forEach((doc: any, j: number) => {
      console.log(`  ${j + 1}. ${doc.name}: ${doc.links?.[0]?.url || 'N/A'}`);
    });
  } else {
    console.log('  No documents available');
  }
});
