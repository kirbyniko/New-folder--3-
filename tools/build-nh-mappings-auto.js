/**
 * NH COMMITTEE MAPPING BUILDER - SMART AUTO MODE
 * 
 * Uses form POST simulation + cheerio (no Puppeteer needed)
 * Attempts to get committee IDs automatically by submitting the search form
 */

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

console.log('🔧 NH COMMITTEE MAPPING BUILDER - AUTO MODE');
console.log('=' .repeat(70));
console.log('\n🚀 Attempting to scrape committee IDs automatically...\n');

async function scrapeCommitteeIds() {
  try {
    // Step 1: Get initial page to extract form fields
    console.log('📄 Fetching initial page...');
    const initialResponse = await fetch('https://www.gencourt.state.nh.us/statstudcomm/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!initialResponse.ok) {
      throw new Error(`Failed to fetch page: ${initialResponse.status}`);
    }
    
    const initialHtml = await initialResponse.text();
    const $ = cheerio.load(initialHtml);
    
    // Extract ViewState and other form fields
    const viewState = $('input[name="__VIEWSTATE"]').val();
    const viewStateGenerator = $('input[name="__VIEWSTATEGENERATOR"]').val();
    const eventValidation = $('input[name="__EVENTVALIDATION"]').val();
    
    console.log(`✅ Form fields extracted (ViewState: ${viewState ? 'found' : 'missing'})\n`);
    
    if (!viewState) {
      console.log('⚠️  No ViewState found - trying alternative method...\n');
      return await scrapeDirect();
    }
    
    // Step 2: Submit search form for active statutory committees
    console.log('📋 Submitting form to search for committees...');
    
    const formData = new URLSearchParams();
    formData.append('__VIEWSTATE', viewState);
    formData.append('__VIEWSTATEGENERATOR', viewStateGenerator || '');
    formData.append('__EVENTVALIDATION', eventValidation || '');
    formData.append('ctl00$pageBody$StatAct', 'on');
    formData.append('ctl00$pageBody$studyact', 'on');
    formData.append('ctl00$pageBody$cmdsubmit', 'Submit');
    
    const searchResponse = await fetch('https://www.gencourt.state.nh.us/statstudcomm/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.gencourt.state.nh.us/statstudcomm/'
      },
      body: formData.toString()
    });
    
    const searchHtml = await searchResponse.text();
    
    // Parse results
    const $results = cheerio.load(searchHtml);
    const committees = [];
    
    // Look for links in results (multiple possible structures)
    $results('a[href*="details.aspx"]').each((i, elem) => {
      const href = $results(elem).attr('href') || '';
      const text = $results(elem).text().trim();
      
      const idMatch = href.match(/id=(\d+)/);
      const chapterMatch = href.match(/txtchapternumber=([^&"']+)/);
      
      if (idMatch && chapterMatch && text) {
        committees.push({
          name: text,
          id: idMatch[1],
          chapter: decodeURIComponent(chapterMatch[1])
        });
      }
    });
    
    if (committees.length > 0) {
      console.log(`✅ SUCCESS! Found ${committees.length} committees!\n`);
      printMappings(committees);
    } else {
      console.log('⚠️  Form POST didn\'t return results. Trying direct scraping...\n');
      await scrapeDirect();
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Falling back to manual mode...\n');
    await scrapeDirect();
  }
}

async function scrapeDirect() {
  // Fallback: Try to find ANY committee links on the main page
  console.log('🔍 Searching page HTML for any committee links...');
  
  try {
    const response = await fetch('https://www.gencourt.state.nh.us/statstudcomm/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const html = await response.text();
    
    // Use regex to find any committee links
    const linkPattern = /details\.aspx\?id=(\d+)&(?:amp;)?txtchapternumber=([^"'&\s]+)/g;
    const matches = [...html.matchAll(linkPattern)];
    
    if (matches.length > 0) {
      console.log(`✅ Found ${matches.length} committee links in page HTML!\n`);
      
      const committees = matches.map(m => ({
        name: 'Unknown (extract from URL)',
        id: m[1],
        chapter: decodeURIComponent(m[2])
      }));
      
      printMappings(committees);
    } else {
      console.log('❌ No committee links found in static HTML');
      console.log('\n💡 The page uses JavaScript to load results.');
      console.log('   Use the manual tool instead: npm run build-mappings:nh\n');
    }
  } catch (error) {
    console.error('❌ Direct scraping failed:', error.message);
    console.log('\n💡 Use manual tool: npm run build-mappings:nh\n');
  }
}

function printMappings(committees) {
  console.log('=' .repeat(70));
  console.log('📋 COPY THIS INTO new-hampshire.ts buildCommitteeMapping():');
  console.log('=' .repeat(70));
  console.log('\nconst knownCommittees: Record<string, { id: string; chapter: string }> = {');
  
  committees.forEach(comm => {
    const normalizedName = comm.name
      .replace(/^NH (House|Senate) - /, '')
      .trim()
      .toUpperCase();
    
    console.log(`  '${normalizedName}': { id: '${comm.id}', chapter: '${comm.chapter}' },`);
  });
  
  console.log('};');
  console.log(`// Last updated: ${new Date().toLocaleDateString()}`);
  console.log('\n' + '='.repeat(70));
  console.log(`\n✅ Successfully extracted ${committees.length} committee mappings!`);
  console.log('📝 Copy the above code into your scraper file.\n');
}

scrapeCommitteeIds();
