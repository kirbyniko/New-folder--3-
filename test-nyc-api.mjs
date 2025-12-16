// Quick test of NYC local meetings API
import fetch from 'node-fetch';

async function testNYCAPI() {
  const url = 'http://localhost:8888/.netlify/functions/local-meetings?lat=40.7128&lng=-74.0060&radius=10';
  
  console.log('Testing NYC local meetings API...');
  console.log('URL:', url);
  console.log();
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`📊 Events returned: ${data.length}`);
    
    if (data.length > 0) {
      console.log('\n🎉 First 3 NYC events:');
      data.slice(0, 3).forEach((event, i) => {
        console.log(`\n${i + 1}. ${event.name}`);
        console.log(`   Date: ${event.date}`);
        console.log(`   Time: ${event.time}`);
        console.log(`   Location: ${event.location}`);
        console.log(`   Committee: ${event.committee}`);
      });
    } else {
      console.log('⚠️ No events returned - check server logs');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Make sure dev server is running: netlify dev');
  }
}

testNYCAPI();
