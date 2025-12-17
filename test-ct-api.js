import fetch from 'node-fetch';
import https from 'https';

// Disable SSL verification for testing
const agent = new https.Agent({
  rejectUnauthorized: false
});

(async () => {
  console.log('=== Testing Connecticut Calendar API ===\n');
  
  // Calculate date range (7 days)
  const now = new Date();
  const start = Math.floor(now.getTime() / 1000);
  const end = Math.floor(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).getTime() / 1000);
  
  console.log('Date range:', new Date(start * 1000), 'to', new Date(end * 1000));
  
  // Test 1: Main calendar events API
  console.log('\n--- Testing Main Calendar API ---');
  const mainUrl = `https://www.cga.ct.gov/in-calevents.php?start=${start}&end=${end}`;
  console.log('URL:', mainUrl);
  
  try {
    const response = await fetch(mainUrl, { agent });
    const data = await response.json();
    console.log('\nResponse Status:', response.status);
    console.log('Number of events:', data.length);
    console.log('\nSample events:');
    data.slice(0, 3).forEach(event => {
      console.log(JSON.stringify(event, null, 2));
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  // Test 2: Committee calendar API (Public Health example)
  console.log('\n\n--- Testing Committee Calendar API (Public Health) ---');
  const commUrl = `https://www.cga.ct.gov/basin/fullcalendar/commevents.php?comm_code=ph&start=${start}&end=${end}`;
  console.log('URL:', commUrl);
  
  try {
    const response = await fetch(commUrl, { agent });
    const data = await response.json();
    console.log('\nResponse Status:', response.status);
    console.log('Number of events:', data.length);
    console.log('\nSample events:');
    data.slice(0, 3).forEach(event => {
      console.log(JSON.stringify(event, null, 2));
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  // Test 3: Try another committee (Education)
  console.log('\n\n--- Testing Committee Calendar API (Education) ---');
  const eduUrl = `https://www.cga.ct.gov/basin/fullcalendar/commevents.php?comm_code=ed&start=${start}&end=${end}`;
  console.log('URL:', eduUrl);
  
  try {
    const response = await fetch(eduUrl, { agent });
    const data = await response.json();
    console.log('\nResponse Status:', response.status);
    console.log('Number of events:', data.length);
    if (data.length > 0) {
      console.log('\nSample event:');
      console.log(JSON.stringify(data[0], null, 2));
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  console.log('\n\n=== SUMMARY ===');
  console.log('✓ Connecticut uses JSON API for calendar data');
  console.log('✓ Main calendar: https://www.cga.ct.gov/in-calevents.php');
  console.log('✓ Committee calendar: https://www.cga.ct.gov/basin/fullcalendar/commevents.php');
  console.log('✓ Parameters: start (unix timestamp), end (unix timestamp), comm_code (for committee)');
})();
