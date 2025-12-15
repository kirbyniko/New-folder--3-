// Direct test of the state-events API function
import { handler } from './netlify/functions/state-events.ts';

console.log('🧪 Testing state-events function directly...\n');

const mockEvent = {
  rawUrl: 'http://localhost:8888/.netlify/functions/state-events?state=NH',
  queryStringParameters: { state: 'NH' }
};

const mockContext = {
  callbackWaitsForEmptyEventLoop: false
};

handler(mockEvent, mockContext)
  .then(response => {
    console.log('\n✅ Function executed successfully!');
    console.log(`Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      const events = JSON.parse(response.body);
      console.log(`\n📅 Total events: ${events.length}`);
      
      const withBills = events.filter(e => e.bills && e.bills.length > 0);
      console.log(`📋 Events with bills: ${withBills.length}`);
      
      if (withBills.length > 0) {
        const first = withBills[0];
        console.log(`\n🎯 ${first.name}`);
        console.log(`  Committee: ${first.committee}`);
        console.log(`  Docket: ${first.docketUrl || 'N/A'}`);
        console.log(`  Bills (${first.bills.length}):`);
        first.bills.forEach(b => {
          console.log(`    - ${b.id}: ${b.title || 'No title'}`);
        });
      }
    } else {
      console.log('\n❌ Error response:');
      console.log(response.body);
    }
  })
  .catch(error => {
    console.error('\n❌ Function failed:', error);
    console.error(error.stack);
  });
