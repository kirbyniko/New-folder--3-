import 'dotenv/config';

const url = 'https://56a5a061.civitracker.pages.dev/api/state-events?state=CA';

console.log('🔍 Testing latest deployment:', url);
console.log('');

try {
  const response = await fetch(url);
  const events = await response.json();
  
  console.log(`✅ Status: ${response.status}`);
  console.log(`📊 Total events: ${events.length}`);
  console.log('');
  
  // Find the specific bills
  const targetBills = ['AB 1092', 'AB 1091', 'AB 1159', 'AB 68', 'AB 1118'];
  
  for (const billNum of targetBills) {
    const event = events.find(e => e.bills?.some(b => b.number === billNum));
    if (event) {
      const bill = event.bills.find(b => b.number === billNum);
      console.log(`📄 ${billNum}:`);
      console.log(`   Event: ${event.name}`);
      console.log(`   Title: ${bill.title}`);
      console.log(`   Has summary property: ${bill.hasOwnProperty('summary')}`);
      console.log(`   Summary value: ${bill.summary ? 'YES' : 'NO/NULL'}`);
      if (bill.summary) {
        console.log(`   Summary preview: ${bill.summary.substring(0, 80)}...`);
      }
      console.log(`   Full bill object keys: ${Object.keys(bill).join(', ')}`);
      console.log('');
    }
  }
} catch (error) {
  console.error('❌ Error:', error.message);
}
