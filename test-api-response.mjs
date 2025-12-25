import 'dotenv/config';

const url = 'https://67d6b663.civitracker.pages.dev/api/state-events?state=CA';

console.log('🔍 Testing API:', url);

const response = await fetch(url);
const data = await response.json();

console.log('\n📊 Response:');
console.log('Status:', response.status);
console.log('Events count:', data.length || 'N/A');

if (Array.isArray(data)) {
  data.forEach((event, i) => {
    console.log(`\n📅 Event ${i + 1}:`, event.name || '[NO NAME]');
    console.log('   Date:', event.date || '[NO DATE]');
    console.log('   Bills:', event.bills?.length || 0);
    
    if (event.bills && event.bills.length > 0) {
      event.bills.forEach(bill => {
        console.log(`     - ${bill.number}: ${bill.title}`);
        console.log(`       Has summary: ${bill.summary ? 'YES' : 'NO'}`);
        if (bill.summary) {
          console.log(`       Summary: ${bill.summary.substring(0, 60)}...`);
        }
      });
    }
  });
} else {
  console.log('\n⚠️  Response is not an array');
  console.log(JSON.stringify(data, null, 2));
}
