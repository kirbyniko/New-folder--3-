import fetch from 'node-fetch';

async function checkDesMoinesAPI() {
  console.log('Checking for Des Moines calendar API...\n');
  
  // The calendar uses Revize calendar system - check for API endpoints
  const baseUrl = 'https://www.dsm.city';
  const apiEndpoints = [
    '/revize/plugins/revize_calendar/api.php?calendar=5&view=list&month=12&year=2025',
    '/revize/plugins/revize_calendar/data.php?calendar=5',
    '/calendar.php?view=json&calendar=5&month=12&year=2025',
    '/api/calendar?id=5&month=12&year=2025',
  ];
  
  for (const endpoint of apiEndpoints) {
    const url = `${baseUrl}${endpoint}`;
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
          console.log(`  Data:`, JSON.stringify(data).substring(0, 500));
          return;
        } else {
          const text = await response.text();
          if (text.includes('{') && text.includes('}')) {
            console.log(`  ⚠️ Might be JSON:`, text.substring(0, 200));
          }
        }
      }
    } catch (error: any) {
      console.log(`  Error: ${error.message}`);
    }
    console.log('');
  }
  
  console.log('\n❌ No direct API found - calendar is JavaScript-rendered');
  console.log('Will need to use Puppeteer to scrape this calendar');
}

checkDesMoinesAPI().catch(console.error);
