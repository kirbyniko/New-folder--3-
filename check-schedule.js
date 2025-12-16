// Check schedule page for meeting data

const html = await (await fetch('https://www.njleg.state.nj.us/committees/senate-committees/schedules?committee=SBA')).text();

const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/);
if (match) {
  const data = JSON.parse(match[1]);
  console.log('PageProps keys:', Object.keys(data.props?.pageProps || {}));
  
  if (data.props?.pageProps) {
    console.log('\n=== FULL PAGEPROPS ===');
    console.log(JSON.stringify(data.props.pageProps, null, 2).substring(0, 4000));
  }
} else {
  console.log('No __NEXT_DATA__ found');
  console.log('HTML length:', html.length);
}
