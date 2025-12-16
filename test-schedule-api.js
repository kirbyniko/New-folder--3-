// Test NJ schedules API

const tests = [
  { house: 'senate', committee: 'SBA' },
  { house: 'assembly', committee: 'AAP' }
];

for (const t of tests) {
  const url = `https://www.njleg.state.nj.us/api/schedules/${t.house}/${t.committee}`;
  console.log(`\n=== ${t.house.toUpperCase()} ${t.committee} ===`);
  console.log(url);
  
  try {
    const response = await fetch(url);
    console.log('Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Type:', Array.isArray(data) ? 'array' : 'object');
      console.log('Length/Keys:', Array.isArray(data) ? data.length : Object.keys(data).length);
      
      if (Array.isArray(data) && data.length > 0) {
        console.log('\n=== FIRST SCHEDULE ===');
        console.log(JSON.stringify(data[0], null, 2));
      } else if (typeof data === 'object' && !Array.isArray(data)) {
        console.log('\n=== DATA STRUCTURE ===');
        console.log(JSON.stringify(data, null, 2).substring(0, 2000));
      }
    }
  } catch (error) {
    console.log('Error:', error.message);
  }
}
