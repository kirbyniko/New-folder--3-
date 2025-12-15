/**
 * NH COMMITTEE MAPPING - PUPPETEER DEBUG VERSION
 * 
 * Step-by-step debugging to see exactly what's happening
 */

import puppeteer from 'puppeteer';

console.log('🔧 NH COMMITTEE MAPPING - PUPPETEER DEBUG\n');

async function testPuppeteer() {
  console.log('1️⃣  Launching browser...');
  const browser = await puppeteer.launch({ 
    headless: false, // Show browser so we can see what's happening
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    dumpio: true // Show browser console
  });
  
  const page = await browser.newPage();
  
  console.log('2️⃣  Navigating to event page...');
  const eventUrl = 'https://www.gencourt.state.nh.us/house/schedule/eventDetails.aspx?event=635&et=2';
  
  try {
    await page.goto(eventUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    console.log('✅ Page loaded successfully\n');
    
    console.log('3️⃣  Checking for "See Docket" button...');
    const docketButton = await page.$('input[id*="btnDocket"]');
    
    if (!docketButton) {
      console.log('❌ No docket button found');
      await browser.close();
      return;
    }
    
    console.log('✅ Docket button found\n');
    
    console.log('4️⃣  Clicking "See Docket" button...');
    
    // Wait for navigation after clicking
    const [response] = await Promise.all([
      page.waitForNavigation({ timeout: 30000 }),
      docketButton.click()
    ]);
    
    const finalUrl = page.url();
    console.log(`✅ Redirected to: ${finalUrl}\n`);
    
    // Extract ID and chapter from URL
    const idMatch = finalUrl.match(/id=(\d+)/);
    const chapterMatch = finalUrl.match(/txtchapternumber=([^&]+)/);
    
    if (idMatch && chapterMatch) {
      console.log('5️⃣  SUCCESS! Extracted mapping:');
      console.log(`    ID: ${idMatch[1]}`);
      console.log(`    Chapter: ${decodeURIComponent(chapterMatch[1])}\n`);
      
      console.log('📋 Add this to new-hampshire.ts:');
      console.log(`'STATE COMMISSION ON AGING': { id: '${idMatch[1]}', chapter: '${decodeURIComponent(chapterMatch[1])}' },\n`);
    } else {
      console.log('❌ Could not extract ID/chapter from URL');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    console.log('\n6️⃣  Closing browser...');
    await browser.close();
    console.log('✅ Done!');
  }
}

testPuppeteer();
