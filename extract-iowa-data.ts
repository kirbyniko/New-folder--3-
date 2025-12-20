import fetch from 'node-fetch';

async function extractIowaData() {
  const url = 'https://www.legis.iowa.gov/committees/meetings/meetingsListComm';
  const html = await (await fetch(url)).text();
  
  console.log('Extracting meeting data from page source...\n');
  
  // Look for meetingData or similar variable
  const patterns = [
    /var\s+meetingData\s*=\s*(\[[\s\S]*?\]);/,
    /var\s+meetings\s*=\s*(\[[\s\S]*?\]);/,
    /meetingsData\s*=\s*(\[[\s\S]*?\]);/,
    /"meetings":\s*(\[[\s\S]*?\])/,
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      console.log('✅ Found meeting data!');
      console.log('\nPattern matched:', pattern.source.substring(0, 50));
      console.log('\nData preview (first 1000 chars):');
      console.log(match[1].substring(0, 1000));
      
      try {
        const data = JSON.parse(match[1]);
        console.log(`\n\n📊 Parsed ${data.length} meetings`);
        
        if (data.length > 0) {
          console.log('\nFirst meeting:');
          console.log(JSON.stringify(data[0], null, 2));
        }
        
        return;
      } catch (e) {
        console.log('Failed to parse as JSON');
      }
    }
  }
  
  console.log('❌ No meeting data found with standard patterns');
  console.log('\nSearching for any JSON arrays in the page...');
  
  // Look for any substantial JSON array
  const arrayMatches = html.match(/\[\s*{\s*"[^"]+"\s*:/g);
  if (arrayMatches) {
    console.log(`Found ${arrayMatches.length} potential JSON array starts`);
  }
}

extractIowaData().catch(console.error);
