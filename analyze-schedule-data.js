// Get full NJ schedule data structure

const url = 'https://www.njleg.state.nj.us/api/schedules/house/S?committee=SBA';
const response = await fetch(url);
const data = await response.json();

console.log('=== RESPONSE STRUCTURE ===');
console.log('Type:', Array.isArray(data) ? 'array' : 'object');
console.log('Outer length:', data.length);
console.log('Inner type:', Array.isArray(data[0]) ? 'array' : 'object');
if (Array.isArray(data[0])) {
  console.log('Inner length:', data[0].length);
}

console.log('\n=== FIRST SCHEDULE (UPCOMING) ===');
const upcoming = data[0]; // First array is upcoming
if (upcoming && upcoming.length > 0) {
  console.log(JSON.stringify(upcoming[0], null, 2));
}

console.log('\n=== FIRST ARCHIVE (PAST) ===');
const archive = data[1]; // Second array is archive
if (archive && archive.length > 0) {
  console.log(JSON.stringify(archive[0], null, 2));
}

// Check if there are bills in the data
console.log('\n=== LOOKING FOR BILLS ===');
const firstMeeting = upcoming?.[0] || archive?.[0];
if (firstMeeting) {
  console.log('Keys:', Object.keys(firstMeeting).join(', '));
  
  // Check for bill-related fields
  const billFields = Object.keys(firstMeeting).filter(k => 
    k.toLowerCase().includes('bill') || k.toLowerCase().includes('agenda')
  );
  console.log('Bill-related fields:', billFields.join(', '));
}
