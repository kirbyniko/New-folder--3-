import puppeteer from 'puppeteer';

console.log('🔍 Scraping Alabama meeting IDs from schedule page...\n');

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();

try {
  await page.goto('https://alison.legislature.state.al.us/todays-schedule', { 
    waitUntil: 'networkidle2',
    timeout: 30000 
  });
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Extract meeting data including the full URLs with meeting IDs
  const meetings = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('tr'));
    const meetingData: any[] = [];
    
    rows.forEach(row => {
      const text = row.textContent?.trim() || '';
      
      if (text.includes('Committee') || text.includes('Commission')) {
        // Find the room link
        const roomLink = Array.from(row.querySelectorAll('a')).find(a => 
          a.textContent?.trim().includes('Room')
        );
        
        if (roomLink) {
          const href = roomLink.getAttribute('href') || '';
          const roomText = roomLink.textContent?.trim() || '';
          
          // Extract meeting name
          const nameMatch = text.match(/(.*?Committee|.*?Commission)/i);
          const name = nameMatch ? nameMatch[0].trim() : '';
          
          // Parse the URL to get location and meeting ID
          const urlParams = new URLSearchParams(href.split('?')[1] || '');
          const location = urlParams.get('location') || '';
          const meeting = urlParams.get('meeting') || '';
          
          meetingData.push({
            name,
            fullText: text.substring(0, 200),
            roomText,
            href,
            location,
            meetingId: meeting
          });
        }
      }
    });
    
    return meetingData;
  });
  
  console.log(`Found ${meetings.length} meetings with room links:\n`);
  
  meetings.forEach((m, i) => {
    console.log(`\n=== Meeting ${i + 1} ===`);
    console.log(`Name: ${m.name}`);
    console.log(`Room: ${m.roomText}`);
    console.log(`Location: ${m.location}`);
    console.log(`Meeting ID: ${m.meetingId}`);
    console.log(`Full URL: https://alison.legislature.state.al.us${m.href}`);
    console.log(`Text: ${m.fullText}`);
  });
  
  // Export as JSON for reference
  console.log('\n\n=== JSON Output ===');
  console.log(JSON.stringify(meetings, null, 2));
  
} catch (error) {
  console.error('❌ Error:', error);
} finally {
  await browser.close();
}
