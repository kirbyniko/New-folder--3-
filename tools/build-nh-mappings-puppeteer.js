/**
 * NH COMMITTEE MAPPING - FULL PUPPETEER SCRAPER
 * 
 * This will:
 * 1. Scrape all current events
 * 2. Visit each unique committee's event page
 * 3. Click "See Docket" button
 * 4. Extract the docket URL parameters
 * 5. Output complete mapping
 */

import puppeteer from 'puppeteer';

// Hardcoded list of events to check (from manual run)
const COMMITTEE_EVENTS = [
  { name: 'STATE VETERANS ADVISORY COMMITTEE', url: 'https://www.gencourt.state.nh.us/house/schedule/eventDetails.aspx?event=1947&et=2' },
  { name: 'ASSESSING STANDARDS BOARD', url: 'https://www.gencourt.state.nh.us/house/schedule/eventDetails.aspx?event=1905&et=2' },
  { name: 'STATE COMMISSION ON AGING', url: 'https://www.gencourt.state.nh.us/house/schedule/eventDetails.aspx?event=635&et=2' },
  { name: 'NEW HAMPSHIRE COUNCIL ON SUICIDE PREVENTION', url: 'https://www.gencourt.state.nh.us/house/schedule/eventDetails.aspx?event=1919&et=2' },
  { name: 'EDUCATION FREEDOM SAVINGS ACCOUNT OVERSIGHT COMMITTEE', url: 'https://www.gencourt.state.nh.us/house/schedule/eventDetails.aspx?event=1967&et=2' },
  { name: 'ADMINISTRATIVE RULES', url: 'https://www.gencourt.state.nh.us/house/schedule/eventDetails.aspx?event=1934&et=2' },
  { name: 'INFORMATION TECHNOLOGY COUNCIL', url: 'https://www.gencourt.state.nh.us/house/schedule/eventDetails.aspx?event=1962&et=2' },
  { name: 'HEALTH AND HUMAN SERVICES OVERSIGHT COMMITTEE', url: 'https://www.gencourt.state.nh.us/house/schedule/eventDetails.aspx?event=1932&et=2' },
  { name: 'COMMISSION TO STUDY COSTS OF SPECIAL EDUCATION', url: 'https://www.gencourt.state.nh.us/house/schedule/eventDetails.aspx?event=1966&et=2' },
  { name: 'FISCAL COMMITTEE', url: 'https://www.gencourt.state.nh.us/house/schedule/eventDetails.aspx?event=1930&et=2' },
  { name: 'HEALTH CARE CONSUMER PROTECTION ADVISORY COMMISSION', url: 'https://www.gencourt.state.nh.us/house/schedule/eventDetails.aspx?event=1964&et=2' },
  { name: 'MOUNT WASHINGTON COMMISSION', url: 'https://www.gencourt.state.nh.us/house/schedule/eventDetails.aspx?event=1979&et=2' },
  { name: 'CAPITAL PROJECT OVERVIEW COMMITTEE', url: 'https://www.gencourt.state.nh.us/house/schedule/eventDetails.aspx?event=1936&et=2' },
  { name: 'ADVISORY COUNCIL ON CAREER AND TECHNICAL EDUCATION', url: 'https://www.gencourt.state.nh.us/house/schedule/eventDetails.aspx?event=1940&et=2' },
  { name: 'LONG RANGE CAPITAL PLANNING AND UTILIZATION COMMITTEE', url: 'https://www.gencourt.state.nh.us/house/schedule/eventDetails.aspx?event=1937&et=2' },
];

console.log('🔧 NH COMMITTEE MAPPING - FULL AUTO SCRAPER');
console.log('=' .repeat(70));
console.log(`\nProcessing ${COMMITTEE_EVENTS.length} committees...\n`);

async function scrapeSingleCommittee(page, committee) {
  try {
    await page.goto(committee.url, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Check for docket button
    const docketButton = await page.$('input[id*="btnDocket"]');
    if (!docketButton) {
      return null; // No docket button = regular committee
    }
    
    // Click and wait for redirect
    const [response] = await Promise.all([
      page.waitForNavigation({ timeout: 30000 }),
      docketButton.click()
    ]);
    
    const finalUrl = page.url();
    const idMatch = finalUrl.match(/id=(\d+)/);
    const chapterMatch = finalUrl.match(/txtchapternumber=([^&]+)/);
    
    if (idMatch && chapterMatch) {
      return {
        name: committee.name,
        id: idMatch[1],
        chapter: decodeURIComponent(chapterMatch[1])
      };
    }
    
    return null;
  } catch (error) {
    console.log(`  ⚠️  Error: ${error.message}`);
    return null;
  }
}

async function scrapeAll() {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  const mappings = [];
  
  for (let i = 0; i < COMMITTEE_EVENTS.length; i++) {
    const committee = COMMITTEE_EVENTS[i];
    process.stdout.write(`[${i + 1}/${COMMITTEE_EVENTS.length}] ${committee.name.substring(0, 50).padEnd(50)}... `);
    
    const result = await scrapeSingleCommittee(page, committee);
    
    if (result) {
      mappings.push(result);
      process.stdout.write('✅\n');
    } else {
      process.stdout.write('⏭️  (no docket)\n');
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  await browser.close();
  
  console.log(`\n✅ Successfully extracted ${mappings.length} committee mappings!\n`);
  
  if (mappings.length > 0) {
    console.log('=' .repeat(70));
    console.log('📋 COPY THIS INTO new-hampshire.ts buildCommitteeMapping():');
    console.log('=' .repeat(70));
    console.log('\nconst knownCommittees: Record<string, { id: string; chapter: string }> = {');
    
    mappings.forEach(m => {
      console.log(`  '${m.name}': { id: '${m.id}', chapter: '${m.chapter}' },`);
    });
    
    console.log('};');
    console.log(`// Last updated: ${new Date().toLocaleDateString()}`);
    console.log('\n' + '='.repeat(70));
  }
}

scrapeAll().catch(console.error);
