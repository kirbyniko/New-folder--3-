import { loadEnvFile } from '../netlify/functions/utils/env-loader.js';
import puppeteer from 'puppeteer';

loadEnvFile();

console.log('🔍 Matching OpenStates events with Alabama schedule meeting IDs...\n');

// Fetch OpenStates events
const OPENSTATES_API = 'https://v3.openstates.org';
const JURISDICTION_ID = 'ocd-jurisdiction/country:us/state:al/government';
const API_KEY = process.env.OPENSTATES_API_KEY;

const response = await fetch(
  `${OPENSTATES_API}/events?jurisdiction=${encodeURIComponent(JURISDICTION_ID)}&per_page=20`,
  {
    headers: {
      'X-API-KEY': API_KEY!,
      'User-Agent': 'Civitron/1.0'
    }
  }
);

const data = await response.json();
console.log(`📊 OpenStates API returned ${data.results?.length || 0} events\n`);

// Scrape Alabama schedule page for meeting IDs
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();

await page.goto('https://alison.legislature.state.al.us/todays-schedule', { 
  waitUntil: 'networkidle2',
  timeout: 30000 
});

await new Promise(resolve => setTimeout(resolve, 3000));

const scheduleMeetings = await page.evaluate(() => {
  const rows = Array.from(document.querySelectorAll('tr'));
  const meetingData: any[] = [];
  
  rows.forEach(row => {
    const text = row.textContent?.trim() || '';
    
    if (text.includes('Committee') || text.includes('Commission')) {
      const roomLink = Array.from(row.querySelectorAll('a')).find(a => 
        a.textContent?.trim().includes('Room')
      );
      
      if (roomLink) {
        const href = roomLink.getAttribute('href') || '';
        const urlParams = new URLSearchParams(href.split('?')[1] || '');
        
        // Extract date/time
        const dateMatch = text.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(\w+)\s+(\d+),\s+(\d+)/);
        const timeMatch = text.match(/(\d+):(\d+)\s+(AM|PM)/);
        
        // Extract committee name
        const nameMatch = text.match(/(.*?Committee|.*?Commission)/i);
        
        meetingData.push({
          name: nameMatch ? nameMatch[0].trim() : '',
          date: dateMatch ? `${dateMatch[2]} ${dateMatch[3]}, ${dateMatch[4]}` : '',
          time: timeMatch ? `${timeMatch[1]}:${timeMatch[2]} ${timeMatch[3]}` : '',
          location: urlParams.get('location') || '',
          meetingId: urlParams.get('meeting') || '',
          fullUrl: `https://alison.legislature.state.al.us${href}`,
          rawText: text.substring(0, 300)
        });
      }
    }
  });
  
  return meetingData;
});

await browser.close();

console.log(`📅 Schedule page has ${scheduleMeetings.length} meetings\n`);

// Try to match events
console.log('=== MATCHING EVENTS ===\n');

for (const osEvent of data.results || []) {
  const osDate = new Date(osEvent.start_date);
  const osName = osEvent.name || '';
  const osLocation = osEvent.location?.name || '';
  
  console.log(`\nOpenStates: ${osName}`);
  console.log(`  Date: ${osDate.toLocaleDateString()}`);
  console.log(`  Location: ${osLocation}`);
  console.log(`  ID: ${osEvent.id}`);
  
  // Try to find match in schedule
  const match = scheduleMeetings.find(sm => {
    const smDate = new Date(sm.date + ', 2026');
    const dateMatch = Math.abs(smDate.getTime() - osDate.getTime()) < 24 * 60 * 60 * 1000;
    const nameMatch = sm.name.toLowerCase().includes(osName.toLowerCase().split(' ')[0]) ||
                     osName.toLowerCase().includes(sm.name.toLowerCase().split(' ')[0]);
    return dateMatch && nameMatch;
  });
  
  if (match) {
    console.log(`  ✅ MATCH FOUND:`);
    console.log(`     Schedule: ${match.name}`);
    console.log(`     Meeting ID: ${match.meetingId}`);
    console.log(`     Full URL: ${match.fullUrl}`);
  } else {
    console.log(`  ❌ No match found`);
  }
}

console.log('\n\n=== ALL SCHEDULE MEETINGS ===\n');
scheduleMeetings.forEach((m, i) => {
  console.log(`${i + 1}. ${m.name}`);
  console.log(`   ${m.date} at ${m.time}`);
  console.log(`   Location: ${m.location}`);
  console.log(`   Meeting ID: ${m.meetingId}`);
  console.log(`   URL: ${m.fullUrl}\n`);
});
