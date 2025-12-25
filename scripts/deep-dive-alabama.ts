import puppeteer from 'puppeteer';

console.log('🔍 Deep diving into Alabama Legislature website...\n');

const browser = await puppeteer.launch({ headless: false });
const page = await browser.newPage();

try {
  console.log('Navigating to Today\'s Schedule...');
  await page.goto('https://alison.legislature.state.al.us/todays-schedule', { 
    waitUntil: 'networkidle0',
    timeout: 30000 
  });
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('\n📸 Taking screenshot...');
  await page.screenshot({ path: 'alabama-schedule.png', fullPage: true });
  
  console.log('\n🔍 Looking for meeting links...');
  
  // Try to find any clickable meeting elements
  const meetings = await page.evaluate(() => {
    const results: any[] = [];
    
    // Look for any links or buttons related to meetings
    const allLinks = Array.from(document.querySelectorAll('a, button, [role="button"]'));
    
    allLinks.forEach(el => {
      const text = el.textContent?.trim() || '';
      const href = el.getAttribute('href') || '';
      
      if (text.toLowerCase().includes('meeting') || 
          text.toLowerCase().includes('committee') ||
          text.toLowerCase().includes('hearing') ||
          href.includes('meeting') ||
          href.includes('event')) {
        results.push({
          text: text.substring(0, 100),
          href,
          tag: el.tagName
        });
      }
    });
    
    return results;
  });
  
  console.log(`Found ${meetings.length} potential meeting elements:\n`);
  meetings.forEach((m, i) => {
    console.log(`${i + 1}. [${m.tag}] ${m.text}`);
    if (m.href) console.log(`   → ${m.href}`);
  });
  
  // Check the page HTML structure
  console.log('\n🔍 Checking for React app data...');
  const reactData = await page.evaluate(() => {
    // Look for any data in window object
    const windowKeys = Object.keys(window).filter(k => 
      k.toLowerCase().includes('react') || 
      k.toLowerCase().includes('data') ||
      k.toLowerCase().includes('state')
    );
    return windowKeys;
  });
  
  console.log('Window keys:', reactData);
  
  console.log('\n✅ Check alabama-schedule.png for visual inspection');
  
} catch (error) {
  console.error('Error:', error);
} finally {
  await browser.close();
}
