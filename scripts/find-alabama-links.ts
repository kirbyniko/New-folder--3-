import puppeteer from 'puppeteer';

console.log('🔍 Looking for Alabama meeting detail links...\n');

const browser = await puppeteer.launch({ headless: false });
const page = await browser.newPage();

try {
  await page.goto('https://alison.legislature.state.al.us/todays-schedule', { 
    waitUntil: 'networkidle2',
    timeout: 30000 
  });
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Get all meeting details with their clickable elements
  const meetingDetails = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('tr'));
    const meetings: any[] = [];
    
    rows.forEach(row => {
      const text = row.textContent?.trim() || '';
      
      if (text.includes('Committee') || text.includes('Commission')) {
        const links = Array.from(row.querySelectorAll('a')).map(a => ({
          text: a.textContent?.trim(),
          href: a.getAttribute('href'),
          onclick: a.getAttribute('onclick')
        }));
        
        const buttons = Array.from(row.querySelectorAll('button, [role="button"]')).map(b => ({
          text: b.textContent?.trim(),
          onclick: b.getAttribute('onclick'),
          class: b.className
        }));
        
        if (links.length > 0 || buttons.length > 0) {
          meetings.push({
            meetingText: text.substring(0, 150),
            links,
            buttons
          });
        }
      }
    });
    
    return meetings;
  });
  
  console.log(`Found ${meetingDetails.length} meetings with clickable elements:\n`);
  
  meetingDetails.forEach((meeting, i) => {
    console.log(`\n=== Meeting ${i + 1} ===`);
    console.log(`Text: ${meeting.meetingText}`);
    
    if (meeting.links.length > 0) {
      console.log('\nLinks:');
      meeting.links.forEach((link: any) => {
        console.log(`  - "${link.text}"`);
        console.log(`    href: ${link.href}`);
        if (link.onclick) console.log(`    onclick: ${link.onclick}`);
      });
    }
    
    if (meeting.buttons.length > 0) {
      console.log('\nButtons:');
      meeting.buttons.forEach((btn: any) => {
        console.log(`  - "${btn.text}"`);
        console.log(`    class: ${btn.class}`);
        if (btn.onclick) console.log(`    onclick: ${btn.onclick}`);
      });
    }
  });
  
  // Try clicking on a "View" or detail link if available
  if (meetingDetails.length > 0 && meetingDetails[0].links.length > 0) {
    const firstLink = meetingDetails[0].links.find((l: any) => 
      l.text?.toLowerCase().includes('view') || 
      l.text?.toLowerCase().includes('details') ||
      l.text?.toLowerCase().includes('agenda')
    );
    
    if (firstLink) {
      console.log(`\n\n🖱️ Clicking on: "${firstLink.text}"`);
      console.log(`   URL: ${firstLink.href}\n`);
      
      // Click the link
      const linkText = firstLink.text;
      await page.evaluate((text) => {
        const links = Array.from(document.querySelectorAll('a'));
        const link = links.find(l => l.textContent?.trim() === text);
        if (link) (link as HTMLElement).click();
      }, linkText);
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log(`📍 URL after click: ${page.url()}`);
      await page.screenshot({ path: 'alabama-detail-page.png', fullPage: true });
    }
  }
  
  console.log('\nKeeping browser open for exploration...');
  await new Promise(resolve => setTimeout(resolve, 10000));
  
} catch (error) {
  console.error('Error:', error);
} finally {
  await browser.close();
}
