/**
 * Direct test of trigger-scrape function logic
 * Bypasses Netlify Dev server to test locally
 */

import { handler } from './netlify/functions/trigger-scrape';

async function test() {
  console.log('🧪 Testing trigger-scrape directly...\n');
  
  const event: any = {
    queryStringParameters: {
      state: 'NH',
      force: 'true'
    }
  };
  
  const context: any = {};
  
  try {
    const result = await handler(event, context);
    console.log('\n📊 Result:');
    console.log('Status Code:', result.statusCode);
    
    const body = JSON.parse(result.body);
    console.log('\n✅ Success:', body.success);
    console.log('📈 Summary:', body.summary);
    
    if (body.details.scraped) {
      console.log('\n🎯 Scraped States:');
      body.details.scraped.forEach((s: any) => {
        console.log(`  ✅ ${s.state}: ${s.count} events (${s.duration})`);
      });
    }
    
    if (body.details.errors && body.details.errors.length > 0) {
      console.log('\n❌ Errors:');
      body.details.errors.forEach((e: any) => {
        console.log(`  ❌ ${e.state}: ${e.error}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

test();
