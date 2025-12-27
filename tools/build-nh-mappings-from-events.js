/**
 * NH COMMITTEE MAPPING BUILDER - EVENT-BASED
 * 
 * This scraper:
 * 1. Gets all current NH events
 * 2. For each unique committee, visits the event details page
 * 3. Simulates clicking "See Docket" button (form POST)
 * 4. Extracts the docket URL's id and chapter parameters
 * 5. Outputs the complete mapping
 * 
 * This is the CORRECT approach - gets IDs from actual event pages!
 */

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { NewHampshireScraper } from '../lib/functions/utils/scrapers/states/new-hampshire.ts';

console.log('🔧 NH COMMITTEE MAPPING BUILDER - EVENT-BASED');
console.log('=' .repeat(70));
console.log('\nThis tool visits event pages and simulates "See Docket" clicks');
console.log('to extract the actual committee IDs.\n');

const scraper = new NewHampshireScraper();

// Disable enrichment to get raw data fast
const originalEnrich = scraper.enrichEventWithRegex;
scraper.enrichEventWithRegex = async (event) => event;

async function extractDocketUrl(eventUrl) {
  try {
    // Step 1: Fetch the event details page
    const response = await fetch(eventUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Check if "See Docket" button exists
    const docketButton = $('input[id*="btnDocket"], input[value*="Docket"]');
    if (docketButton.length === 0) {
      return null; // No docket button = regular committee, skip
    }
    
    // Step 2: Extract ViewState and form data
    const viewState = $('input[name="__VIEWSTATE"]').val();
    const viewStateGenerator = $('input[name="__VIEWSTATEGENERATOR"]').val();
    const eventValidation = $('input[name="__EVENTVALIDATION"]').val();
    
    // Get the actual button name/id
    const buttonName = docketButton.attr('name');
    
    if (!buttonName || !viewState) {
      return null;
    }
    
    // Step 3: Submit the form (simulate button click)
    const formData = new URLSearchParams();
    formData.append('__VIEWSTATE', viewState);
    formData.append('__VIEWSTATEGENERATOR', viewStateGenerator || '');
    formData.append('__EVENTVALIDATION', eventValidation || '');
    formData.append(buttonName, 'See Docket');
    
    const postResponse = await fetch(eventUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': eventUrl
      },
      body: formData.toString(),
      redirect: 'manual' // Don't follow redirect, we want the Location header
    });
    
    // Step 4: Get redirect URL (the docket page)
    const redirectUrl = postResponse.headers.get('location');
    
    if (redirectUrl) {
      // Extract id and chapter from redirect URL
      const idMatch = redirectUrl.match(/id=(\d+)/);
      const chapterMatch = redirectUrl.match(/txtchapternumber=([^&]+)/);
      
      if (idMatch && chapterMatch) {
        return {
          id: idMatch[1],
          chapter: decodeURIComponent(chapterMatch[1]),
          url: redirectUrl
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error(`  ⚠️  Error processing ${eventUrl}: ${error.message}`);
    return null;
  }
}

async function buildMappings() {
  console.log('📅 Fetching current NH events...\n');
  
  const events = await scraper.scrapeCalendar();
  
  console.log(`✅ Found ${events.length} events\n`);
  console.log('🔍 Extracting committee mappings...\n');
  
  // Group events by committee
  const committeeEvents = new Map();
  events.forEach(event => {
    const committee = event.committee
      ?.replace(/^NH (House|Senate) - /, '')
      .trim()
      .toUpperCase();
    
    if (committee && !committeeEvents.has(committee)) {
      committeeEvents.set(committee, {
        name: committee,
        eventUrl: event.detailsUrl,
        count: 1
      });
    } else if (committee) {
      committeeEvents.get(committee).count++;
    }
  });
  
  const sorted = Array.from(committeeEvents.values())
    .sort((a, b) => b.count - a.count);
  
  console.log(`📊 Processing ${sorted.length} unique committees...\n`);
  
  const mappings = [];
  let processed = 0;
  let foundDockets = 0;
  
  for (const comm of sorted) {
    processed++;
    process.stdout.write(`\r[${processed}/${sorted.length}] Processing ${comm.name.substring(0, 40)}...`);
    
    const docketInfo = await extractDocketUrl(comm.eventUrl);
    
    if (docketInfo) {
      foundDockets++;
      mappings.push({
        name: comm.name,
        id: docketInfo.id,
        chapter: docketInfo.chapter,
        count: comm.count
      });
      process.stdout.write(` ✅\n`);
    } else {
      process.stdout.write(` ⏭️  (no docket)\n`);
    }
    
    // Small delay to be nice to the server
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\n\n✅ Successfully extracted ${foundDockets} committee mappings!\n`);
  
  if (mappings.length === 0) {
    console.log('❌ No docket URLs found. This might indicate:');
    console.log('   - Form POST simulation not working correctly');
    console.log('   - Website structure changed');
    console.log('   - All committees are regular (no statutory/study committees)\n');
    return;
  }
  
  // Print results
  console.log('=' .repeat(70));
  console.log('📋 COPY THIS INTO new-hampshire.ts buildCommitteeMapping():');
  console.log('=' .repeat(70));
  console.log('\nconst knownCommittees: Record<string, { id: string; chapter: string }> = {');
  
  mappings.forEach(m => {
    console.log(`  '${m.name}': { id: '${m.id}', chapter: '${m.chapter}' }, // ${m.count} events`);
  });
  
  console.log('};');
  console.log(`// Last updated: ${new Date().toLocaleDateString()}`);
  console.log(`// Coverage: ${foundDockets}/${sorted.length} committees (${Math.round(foundDockets/sorted.length*100)}%)`);
  console.log('\n' + '='.repeat(70));
}

buildMappings().catch(console.error);
