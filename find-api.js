// Try to find the NJ Legislature API endpoint

const html = await (await fetch('https://www.njleg.state.nj.us/committees/senate-committees')).text();

// Get script URLs
const scripts = html.match(/<script[^>]*src=["']([^"']+)["'][^>]*>/g) || [];
const scriptUrls = scripts
  .map(s => s.match(/src=["']([^"']+)["']/)?.[1])
  .filter(u => u && u.includes('/_next/static'));

console.log(`Found ${scriptUrls.length} Next.js script bundles`);

if (scriptUrls.length > 0) {
  const mainScript = scriptUrls.find(url => url.includes('pages/committees')) || scriptUrls[0];
  const fullUrl = mainScript.startsWith('http') ? mainScript : 'https://www.njleg.state.nj.us' + mainScript;
  
  console.log(`\nFetching: ${fullUrl.substring(0, 80)}...`);
  const js = await (await fetch(fullUrl)).text();
  
  // Look for API patterns
  const apiMatches = js.match(/["'](\/api\/[^"'\s]+)["']/g);
  if (apiMatches) {
    const uniqueApis = [...new Set(apiMatches.map(m => m.replace(/['"]/g, '')))];
    console.log('\n=== API ENDPOINTS FOUND ===');
    uniqueApis.forEach(api => console.log(api));
  }
  
  // Look for fetch calls
  const fetchMatches = js.match(/fetch\([^)]+\)/g);
  if (fetchMatches) {
    console.log('\n=== FETCH CALLS (first 5) ===');
    fetchMatches.slice(0, 5).forEach(f => console.log(f));
  }
}
