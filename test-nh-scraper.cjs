// Quick test of NH scraper JSON endpoint
const https = require('https');

function testEndpoint(url, name) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔍 Testing ${name}: ${url}`);
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          console.log(`✅ Status: ${res.statusCode}`);
          console.log(`📄 Data length: ${data.length} bytes`);
          
          // Try to parse the response
          const jsonMatch = data.match(/"d"\s*:\s*"([^"]+)"/);
          if (jsonMatch) {
            const jsonString = jsonMatch[1]
              .replace(/\\"/g, '"')
              .replace(/\\r/g, '\r')
              .replace(/\\n/g, '\n')
              .replace(/\\t/g, '\t');
            
            const events = JSON.parse(jsonString);
            console.log(`📅 Events found: ${events.length}`);
            if (events.length > 0) {
              console.log(`📝 First event:`, events[0]);
            }
            resolve(events);
          } else {
            console.log('❌ No JSON data found in response');
            console.log('Response preview:', data.substring(0, 200));
            resolve([]);
          }
        } catch (error) {
          console.error('❌ Parse error:', error.message);
          reject(error);
        }
      });
    }).on('error', (error) => {
      console.error(`❌ Request error:`, error.message);
      reject(error);
    });
  });
}

async function main() {
  console.log('🚀 Testing NH Legislature JSON Endpoints\n');
  
  try {
    const houseEvents = await testEndpoint(
      'https://www.gencourt.state.nh.us/house/schedule/CalendarWS.asmx/GetEvents',
      'House Calendar'
    );
    
    const senateEvents = await testEndpoint(
      'https://www.gencourt.state.nh.us/senate/schedule/CalendarWS.asmx/GetEvents',
      'Senate Calendar'
    );
    
    console.log(`\n✅ Total events: ${houseEvents.length + senateEvents.length} (House: ${houseEvents.length}, Senate: ${senateEvents.length})`);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

main();
