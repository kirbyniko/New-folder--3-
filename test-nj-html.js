const response = await fetch('https://www.njleg.state.nj.us/committees/senate-committees');
const html = await response.text();

console.log('This is a Next.js app - looking for __NEXT_DATA__...\n');

// Extract Next.js data
const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/);
if (nextDataMatch) {
  const data = JSON.parse(nextDataMatch[1]);
  console.log('Found __NEXT_DATA__!');
  console.log('Props keys:', Object.keys(data.props || {}));
  console.log('PageProps keys:', Object.keys(data.props?.pageProps || {}));
  
  if (data.props?.pageProps?.committees) {
    console.log('\n=== COMMITTEES DATA ===');
    const committees = data.props.pageProps.committees;
    console.log('Total committees:', committees.length);
    console.log('\nFirst 3 committees:');
    committees.slice(0, 3).forEach(c => {
      console.log(`- ${c.code}: ${c.name}`);
      console.log(`  Schedule URL: ${c.scheduleUrl || 'N/A'}`);
    });
  }
  
  // Show full structure of first item
  if (data.props?.pageProps) {
    console.log('\n=== FULL PAGEPROPS STRUCTURE ===');
    console.log(JSON.stringify(data.props.pageProps, null, 2).substring(0, 2000));
  }
} else {
  console.log('No __NEXT_DATA__ found - page might load data differently');
  console.log('Searching for committee patterns in HTML...');
  const matches = html.match(/committee[a-z0-9\-_]+/gi);
  if (matches) {
    console.log('Found patterns:', [...new Set(matches)].slice(0, 10));
  }
}
