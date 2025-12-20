import fetch from 'node-fetch';

async function testOpenStatesIowa() {
  const apiKey = process.env.OPENSTATES_API_KEY;
  
  if (!apiKey) {
    console.log('❌ OPENSTATES_API_KEY not found');
    return;
  }
  
  console.log('Testing OpenStates for Iowa...\n');
  
  // Test with ocd-jurisdiction format
  const jurisdictionIds = [
    'ocd-jurisdiction/country:us/state:ia/government',
    'Iowa',
    'IA'
  ];
  
  for (const jurisdictionId of jurisdictionIds) {
    console.log(`\nTrying jurisdiction: ${jurisdictionId}`);
    try {
      const url = `https://v3.openstates.org/events?jurisdiction=${encodeURIComponent(jurisdictionId)}&per_page=5`;
      const response = await fetch(url, {
        headers: { 'X-API-KEY': apiKey }
      });
      
      console.log(`Status: ${response.status}`);
      
      if (response.status === 200) {
        const data: any = await response.json();
        console.log(`✅ Found ${data.results?.length || 0} events`);
        
        if (data.results && data.results.length > 0) {
          console.log('\nFirst event:');
          console.log(JSON.stringify(data.results[0], null, 2).substring(0, 800));
          return;
        }
      }
    } catch (error: any) {
      console.log(`Error: ${error.message}`);
    }
  }
}

testOpenStatesIowa().catch(console.error);
