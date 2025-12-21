/**
 * Test PostgreSQL Integration
 * 
 * This script tests:
 * 1. Database connection
 * 2. Event insertion
 * 3. Bill linking
 * 4. Tag insertion
 * 5. Query operations
 */

import 'dotenv/config';
import { checkDatabaseConnection, closePool } from './netlify/functions/utils/db/connection.ts';
import { insertEvent, insertBills, insertTags, getStateEvents } from './netlify/functions/utils/db/events.ts';
import { LegislativeEvent, BillInfo } from './src/types/event.ts';

async function runTests() {
  console.log('🧪 Testing PostgreSQL Integration\n');
  
  // Test 1: Connection
  console.log('1️⃣ Testing database connection...');
  const connected = await checkDatabaseConnection();
  if (!connected) {
    console.error('❌ Database connection failed. Check your .env file and PostgreSQL service.');
    process.exit(1);
  }
  console.log('✅ Connection successful\n');
  
  // Test 2: Insert a test event
  console.log('2️⃣ Inserting test event...');
  const testEvent: LegislativeEvent = {
    name: 'Test Committee Hearing on Budget',
    date: new Date('2025-01-15'),
    time: '10:00 AM',
    location: 'State Capitol, Room 201',
    lat: 38.5767,
    lng: -121.4934,
    level: 'state',
    type: 'hearing',
    committee: 'Budget Committee',
    description: 'Annual budget review hearing',
    detailsUrl: 'https://example.com/hearing/12345',
    docketUrl: 'https://example.com/docket/12345',
  };
  
  try {
    const eventId = await insertEvent(testEvent, 'test-scraper');
    console.log(`✅ Event inserted with ID: ${eventId}\n`);
    
    // Test 3: Insert bills
    console.log('3️⃣ Inserting test bills...');
    const testBills: BillInfo[] = [
      {
        number: 'AB 123',
        title: 'Budget Allocation Act',
        url: 'https://example.com/bill/ab123',
        status: 'In Committee',
      },
      {
        number: 'SB 456',
        title: 'Revenue Enhancement Bill',
        url: 'https://example.com/bill/sb456',
        status: 'Passed Assembly',
      },
    ];
    
    await insertBills(eventId, testBills, 'CA');
    console.log('✅ Bills inserted and linked to event\n');
    
    // Test 4: Insert tags
    console.log('4️⃣ Inserting test tags...');
    const testTags = ['budget', 'finance', 'public-hearing'];
    await insertTags(eventId, testTags);
    console.log('✅ Tags inserted\n');
    
    // Test 5: Query events
    console.log('5️⃣ Querying events for CA...');
    const events = await getStateEvents('CA');
    console.log(`✅ Found ${events.length} event(s) for California`);
    
    if (events.length > 0) {
      const event = events[0];
      console.log('\n📄 Sample Event:');
      console.log(`   Name: ${event.name}`);
      console.log(`   Date: ${event.date}`);
      console.log(`   Location: ${event.location}`);
      console.log(`   Bills: ${event.bills?.length || 0}`);
      console.log(`   Tags: ${event.tags?.join(', ') || 'none'}`);
    }
    
    console.log('\n✅ All tests passed!');
    console.log('\n💡 Next steps:');
    console.log('   1. Set USE_POSTGRESQL=true in .env to enable reads');
    console.log('   2. Run a scraper to populate real data');
    console.log('   3. Test the API endpoints\n');
    
  } catch (err: any) {
    console.error('❌ Test failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Run tests
runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
