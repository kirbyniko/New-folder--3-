/**
 * NH COMMITTEE MAPPING BUILDER
 * 
 * This is a MANUAL utility to build committee ID mappings.
 * Run this ONCE (or when IDs need updating), then copy the output into new-hampshire.ts
 * 
 * This should NOT be part of the main scraper - it's a maintenance tool.
 * 
 * Usage:
 *   1. npm install puppeteer (if not installed)
 *   2. node build-nh-committee-mappings.js
 *   3. Wait ~30 seconds while it scrapes
 *   4. Copy the outputted mappings into new-hampshire.ts
 *   5. Commit and deploy
 * 
 * Re-run this utility only if:
 *   - Committee IDs stop working
 *   - New committees are added
 *   - You want to verify current mappings
 */

import puppeteer from 'puppeteer';

console.log('🔧 NH COMMITTEE MAPPING BUILDER');
console.log('================================\n');
console.log('This tool uses a headless browser to scrape committee IDs from the NH legislature website.');
console.log('Run this MANUALLY when you need to build or update committee mappings.\n');

async function buildCommitteeMappings() {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    console.log('📄 Loading statstudcomm page...');
    await page.goto('https://www.gencourt.state.nh.us/statstudcomm/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('✅ Page loaded\n');
    console.log('🔍 Searching for active statutory and study committees...\n');
    
    // Wait for the checkboxes to be available
    await page.waitForSelector('input[type="checkbox"]', { timeout: 10000 });
    
    // Check the "Active Statutory" and "Active Study" checkboxes
    await page.evaluate(() => {
      const statAct = document.querySelector('input#pageBody_StatAct, input[name*="StatAct"]');
      const studyAct = document.querySelector('input#pageBody_studyact, input[name*="studyact"]');
      if (statAct) statAct.checked = true;
      if (studyAct) studyAct.checked = true;
    });
    
    // Click submit
    await page.click('#pageBody_cmdsubmit');
    
    // Wait for results to load
    console.log('⏳ Waiting for search results...');
    await page.waitForTimeout(3000); // Give it time to render
    
    // Extract committee links
    const committees = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="details.aspx"]'));
      return links.map(link => {
        const href = link.getAttribute('href') || '';
        const text = link.textContent?.trim() || '';
        
        const idMatch = href.match(/id=(\d+)/);
        const chapterMatch = href.match(/txtchapternumber=([^&"]+)/);
        
        if (idMatch && chapterMatch) {
          return {
            name: text,
            id: idMatch[1],
            chapter: decodeURIComponent(chapterMatch[1])
          };
        }
        return null;
      }).filter(Boolean);
    });
    
    if (committees.length === 0) {
      console.log('❌ No committees found. The page structure may have changed.\n');
      console.log('💡 Fallback: Visit each event page manually and click "See Docket"\n');
      return;
    }
    
    console.log(`✅ Found ${committees.length} committees!\n`);
    console.log('=' .repeat(80));
    console.log('📋 COPY THIS INTO new-hampshire.ts buildCommitteeMapping():');
    console.log('=' .repeat(80));
    console.log('\nconst knownCommittees: Record<string, { id: string; chapter: string }> = {');
    
    committees.forEach(comm => {
      // Normalize committee name (remove "NH House -" or "NH Senate -" prefix)
      const normalizedName = comm.name
        .replace(/^NH (House|Senate) - /, '')
        .trim()
        .toUpperCase();
      
      console.log(`  '${normalizedName}': { id: '${comm.id}', chapter: '${comm.chapter}' },`);
    });
    
    console.log('};');
    console.log('\n' + '='.repeat(80));
    console.log(`\n✅ Successfully extracted ${committees.length} committee mappings!`);
    console.log(`📝 Last updated: ${new Date().toLocaleDateString()}\n`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('  1. Make sure puppeteer is installed: npm install puppeteer');
    console.log('  2. Check if the NH website is accessible');
    console.log('  3. The page structure may have changed - inspect manually\n');
  } finally {
    await browser.close();
  }
}

console.log('🚀 Starting browser...\n');
buildCommitteeMappings().catch(console.error);
