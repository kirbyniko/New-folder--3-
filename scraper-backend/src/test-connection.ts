/**
 * Test D1 database connection
 * 
 * Run this to verify wrangler CLI is working and D1 is accessible
 */

import { execSync } from 'child_process';

async function test() {
  console.log('🔌 Testing D1 connection...\n');
  
  try {
    console.log('Testing wrangler CLI...');
    const result = execSync(
      'wrangler d1 execute civitracker-db --remote --command="SELECT COUNT(*) as count FROM events;"',
      { encoding: 'utf-8' }
    );
    
    console.log('\n✅ D1 database is accessible!');
    console.log(result);
    
    console.log('\n📊 Getting database statistics...');
    const stats = execSync(
      'wrangler d1 execute civitracker-db --remote --command="SELECT COUNT(*) as total_events, (SELECT COUNT(*) FROM events WHERE date >= date(\'now\')) as upcoming_events, (SELECT COUNT(DISTINCT state_code) FROM events) as states FROM events;"',
      { encoding: 'utf-8' }
    );
    console.log(stats);
    
    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed!');
    console.error(error);
    process.exit(1);
  }
}

test().catch(console.error);
