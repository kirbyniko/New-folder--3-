// Deep dive into schedule page to find the data API

const html = await (await fetch('https://www.njleg.state.nj.us/committees/senate-committees/schedules?committee=SBA')).text();

// Extract all script tags
const scriptMatches = html.match(/<script[^>]*src=["']([^"']+)["'][^>]*>/g) || [];
const scriptUrls = scriptMatches
  .map(s => s.match(/src=["']([^"']+)["']/)?.[1])
  .filter(u => u && (u.includes('schedule') || u.includes('committee') || u.includes('pages')));

console.log('=== SCHEDULE-RELATED SCRIPTS ===');
scriptUrls.forEach(url => console.log(url));

// Get the main page script
const mainScript = scriptUrls.find(u => u.includes('schedules')) || scriptUrls[0];
if (mainScript) {
  const fullUrl = mainScript.startsWith('http') ? mainScript : 'https://www.njleg.state.nj.us' + mainScript;
  console.log(`\n=== FETCHING: ${fullUrl.substring(0, 100)}... ===`);
  
  const js = await (await fetch(fullUrl)).text();
  
  // Look for API paths
  const apiPaths = [...new Set(js.match(/["']\/api\/[^"'\s]+["']/g) || [])].map(m => m.replace(/["']/g, ''));
  console.log('\n=== API PATHS IN SCRIPT ===');
  apiPaths.forEach(path => console.log(path));
  
  // Look for fetch/axios calls
  const fetchCalls = js.match(/fetch\(["']([^"']+)["']/g) || [];
  console.log('\n=== FETCH CALLS ===');
  fetchCalls.slice(0, 10).forEach(call => console.log(call));
  
  // Look for "schedule" mentions near API calls
  const scheduleContext = js.match(/.{0,100}(schedule|meeting|agenda).{0,100}api.{0,100}/gi);
  if (scheduleContext) {
    console.log('\n=== SCHEDULE + API CONTEXT ===');
    scheduleContext.slice(0, 5).forEach(ctx => console.log(ctx));
  }
}
