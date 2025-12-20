import fetch from 'node-fetch';

async function checkIowaAPI() {
  console.log('Checking for Iowa Legislature API endpoints...\n');
  
  // Try potential API endpoints
  const endpoints = [
    'https://www.legis.iowa.gov/api/committees/meetings',
    'https://www.legis.iowa.gov/api/meetings',
    'https://www.legis.iowa.gov/api/calendar',
    'https://data.iowa.gov/api/committees',
  ];
  
  for (const url of endpoints) {
    console.log(`Testing: ${url}`);
    try {
      const response = await fetch(url);
      console.log(`  Status: ${response.status}`);
      
      if (response.status === 200) {
        const contentType = response.headers.get('content-type');
        console.log(`  Content-Type: ${contentType}`);
        
        if (contentType?.includes('json')) {
          const data = await response.json();
          console.log(`  ✅ JSON API found!`);
          console.log(`  Sample data:`, JSON.stringify(data).substring(0, 500));
        }
      }
    } catch (error: any) {
      console.log(`  ❌ ${error.message}`);
    }
    console.log('');
  }
  
  // Check the actual page source for data
  console.log('\nChecking page source for embedded data...');
  const pageUrl = 'https://www.legis.iowa.gov/committees/meetings/meetingsListComm';
  const html = await (await fetch(pageUrl)).text();
  
  // Look for JSON data in script tags
  const jsonMatches = html.match(/var\s+\w+\s*=\s*(\[[\s\S]*?\]|{[\s\S]*?});/g);
  if (jsonMatches) {
    console.log(`Found ${jsonMatches.length} potential JSON variables`);
    jsonMatches.slice(0, 3).forEach((match, i) => {
      console.log(`\nVariable ${i + 1}:`, match.substring(0, 200));
    });
  }
  
  // Check for specific meeting-related patterns
  if (html.includes('meetingData') || html.includes('meetings')) {
    console.log('\n✅ Found "meetings" or "meetingData" in page source');
  }
}

checkIowaAPI().catch(console.error);
