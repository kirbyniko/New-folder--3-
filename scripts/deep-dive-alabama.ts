import puppeteer from 'puppeteer';

console.log('🔍 Deep diving into Alabama Legislature website...\n');
console.log('Going to click on actual meeting events to find their URLs...\n');

const browser = await puppeteer.launch({ headless: false });
const page = await browser.newPage();

try {
  console.log('Navigating to Today\'s Schedule...');
  await page.goto('https://alison.legislature.state.al.us/todays-schedule', { 
    waitUntil: 'networkidle2',
    timeout: 30000 
  });
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('\n🔍 Finding clickable meeting rows...');
  
  // Find all table rows that contain meeting information
  const meetingRows = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('tr'));
    const meetingInfo: any[] = [];
    
    rows.forEach((row, idx) => {
      const text = row.textContent?.trim() || '';
      // Look for rows with committee names or meeting info
      if ((text.includes('Committee') || text.includes('Commission') || text.includes('Meeting')) 
          && text.length > 20 && text.length < 500) {
        meetingInfo.push({
          index: idx,
          text: text.substring(0, 200),
          hasLinks: row.querySelectorAll('a').length > 0
        });
      }
    });
    
    return meetingInfo;
  });
  
  console.log(`Found ${meetingRows.length} meeting rows\n`);
  
  if (meetingRows.length > 0) {
    // Try clicking on the first few meetings to see what happens
    console.log('🖱️ Clicking on first meeting to get event URL...\n');
    
    const firstMeeting = meetingRows[0];
    console.log(`Clicking: ${firstMeeting.text.substring(0, 80)}...`);
    
    // Click on the row
    const rowSelector = `tr:nth-of-type(${firstMeeting.index + 1})`;
    
    // Set up listener for navigation or popup
    const navigationPromise = page.waitForNavigation({ 
      waitUntil: 'networkidle2',
      timeout: 5000 
    }).catch(() => null);
    
    await page.click(rowSelector);
    
    // Wait a bit to see if anything happens
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const currentUrl = page.url();
    console.log(`\n📍 Current URL after click: ${currentUrl}`);
    
    // Check if a modal or details section appeared
    const modalContent = await page.evaluate(() => {
      // Look for any visible modal or details panel
      const modals = document.querySelectorAll('[role="dialog"], .modal, .details, [class*="detail"]');
      if (modals.length > 0) {
        return Array.from(modals).map(m => m.textContent?.substring(0, 200));
      }
      return null;
    });
    
    if (modalContent) {
      console.log('\n📋 Modal/Details content:', modalContent);
    }
    
    // Take screenshot
    await page.screenshot({ path: 'alabama-meeting-clicked.png', fullPage: true });
    console.log('\n📸 Screenshot saved: alabama-meeting-clicked.png');
  }
  
  console.log('\n✅ Check screenshots for visual inspection');
  console.log('Keeping browser open for 10 seconds so you can explore...');
  await new Promise(resolve => setTimeout(resolve, 10000));
  
} catch (error) {
  console.error('Error:', error);
} finally {
  await browser.close();
}
