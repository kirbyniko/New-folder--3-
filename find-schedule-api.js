// Find NJ schedule API endpoint

// First, try the committee list API to see structure
const committeesResponse = await fetch('https://www.njleg.state.nj.us/api/legislatorData/committeeInfo/senate');
const committeesData = await committeesResponse.json();

console.log('=== SENATE COMMITTEES ===');
console.log(`Total committees: ${committeesData.length}`);

// Get first committee with schedules
const committeesFlat = committeesData.flat();
const committeeWithSchedules = committeesFlat.find(c => c.ScheduleCount > 0);

if (committeeWithSchedules) {
  console.log('\nCommittee with schedules:');
  console.log(`  Code: ${committeeWithSchedules.Comm_Status}`);
  console.log(`  Name: ${committeeWithSchedules.Code_Description}`);
  console.log(`  Schedule Count: ${committeeWithSchedules.ScheduleCount}`);
  
  // Try to find schedule API
  const testUrls = [
    `https://www.njleg.state.nj.us/api/legislatorData/committeeSchedule/${committeeWithSchedules.Comm_Status}`,
    `https://www.njleg.state.nj.us/api/legislatorData/schedules/${committeeWithSchedules.Comm_Status}`,
    `https://www.njleg.state.nj.us/api/committee/schedule/${committeeWithSchedules.Comm_Status}`,
    `https://www.njleg.state.nj.us/api/committees/schedules?committee=${committeeWithSchedules.Comm_Status}`,
  ];
  
  console.log('\n=== TESTING SCHEDULE ENDPOINTS ===');
  for (const url of testUrls) {
    try {
      const response = await fetch(url);
      console.log(`\n${url.substring(40)}`);
      console.log(`  Status: ${response.status}`);
      console.log(`  Type: ${response.headers.get('content-type')?.substring(0, 30)}`);
      
      if (response.ok && response.headers.get('content-type')?.includes('json')) {
        const data = await response.json();
        console.log(`  Data: ${typeof data} ${Array.isArray(data) ? `[length: ${data.length}]` : `{keys: ${Object.keys(data).length}}`}`);
        if (Array.isArray(data) && data.length > 0) {
          console.log('  FOUND SCHEDULES! First item keys:', Object.keys(data[0]).join(', '));
          console.log('\n=== SAMPLE SCHEDULE DATA ===');
          console.log(JSON.stringify(data[0], null, 2).substring(0, 1500));
        } else if (typeof data === 'object' && !Array.isArray(data)) {
          console.log('  Object keys:', Object.keys(data).slice(0, 10).join(', '));
        }
      }
    } catch (error) {
      console.log(`  Error: ${error.message}`);
    }
  }
}
