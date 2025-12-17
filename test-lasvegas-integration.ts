// Test Las Vegas integration with local-meetings API
import { handler } from './netlify/functions/local-meetings';

async function testLasVegasIntegration() {
  console.log('Testing Las Vegas integration with local-meetings API...\n');
  
  // Las Vegas coordinates: 36.1699° N, 115.1398° W
  const event = {
    queryStringParameters: {
      lat: '36.1699',
      lng: '-115.1398',
      radius: '50'
    }
  };
  
  try {
    const response = await handler(event as any, {} as any);
    
    if (!response) {
      console.error('❌ No response from handler');
      return;
    }
    
    const data = JSON.parse(response.body);
    
    console.log(`✅ API Response:`);
    console.log(`   Status: ${response.statusCode}`);
    console.log(`   Events found: ${data.length}`);
    
    if (data.length > 0) {
      console.log(`\nFirst 3 events:`);
      data.slice(0, 3).forEach((event: any, i: number) => {
        console.log(`\n${i + 1}. ${event.name || event.title}`);
        console.log(`   📅 ${event.date}`);
        console.log(`   📍 ${event.city}, ${event.state}`);
        console.log(`   🏛️ ${event.committee}`);
        if (event.docketUrl) {
          console.log(`   📄 Docket: ${event.docketUrl}`);
        }
      });
      
      // Check for Las Vegas events
      const lasVegasEvents = data.filter((e: any) => e.city === 'Las Vegas');
      console.log(`\n📊 Las Vegas events: ${lasVegasEvents.length}`);
      
      if (lasVegasEvents.length > 0) {
        console.log('\n✅ SUCCESS: Las Vegas local scraper is integrated!');
      } else {
        console.log('\n⚠️ WARNING: No Las Vegas events found');
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testLasVegasIntegration();
