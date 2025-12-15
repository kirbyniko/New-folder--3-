/**
 * Test NH Docket Page Structure
 * Phase 1, Step 1.2: Create test scraper to analyze docket pages
 */

import { parseHTML } from './utils/scrapers/html-parser';

async function testMultipleDockets() {
  console.log('🔍 Testing NH Docket Page Structure\n');
  console.log('='.repeat(60));
  
  // Get some NH events
  const response = await fetch('http://localhost:8888/.netlify/functions/state-events?state=NH');
  const events = await response.json();
  
  console.log(`📊 Found ${events.length} NH events total`);
  
  // Test first 5 events with URLs
  const eventsWithUrls = events.filter((e: any) => e.url).slice(0, 5);
  console.log(`🔗 Testing ${eventsWithUrls.length} events with detail URLs\n`);
  
  for (let i = 0; i < eventsWithUrls.length; i++) {
    const event = eventsWithUrls[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 Event ${i + 1}: ${event.name}`);
    console.log(`🔗 URL: ${event.url}`);
    console.log(`📅 Date: ${event.date}`);
    
    try {
      // Fetch docket page
      const docketResponse = await fetch(event.url);
      const html = await docketResponse.text();
      const $ = parseHTML(html);
      
      // Look for bills section
      console.log('\n🔍 STRUCTURE ANALYSIS:');
      
      // Check for bill-related elements
      const billGridComment = html.includes('bills grid');
      console.log(`  Bills grid comment found: ${billGridComment}`);
      
      // Look for common bill link patterns
      const billLinks = $('a[href*="bill"]').length;
      console.log(`  Links containing "bill": ${billLinks}`);
      
      // Look for HB/SB patterns in text
      const textContent = $('body').text();
      const hbMatches = textContent.match(/\bHB\s*\d+/gi);
      const sbMatches = textContent.match(/\bSB\s*\d+/gi);
      console.log(`  HB mentions: ${hbMatches ? hbMatches.length : 0}`);
      console.log(`  SB mentions: ${sbMatches ? sbMatches.length : 0}`);
      
      if (hbMatches || sbMatches) {
        console.log(`  📜 BILLS FOUND:`);
        if (hbMatches) hbMatches.forEach(b => console.log(`    - ${b}`));
        if (sbMatches) sbMatches.forEach(b => console.log(`    - ${b}`));
      }
      
      // Check for Zoom link
      const zoomLink = $('a[href*="zoom.us"]').attr('href') || 
                       html.match(/https:\/\/[^\s<>"]+zoom\.us[^\s<>"]*/)?.[0];
      if (zoomLink) {
        console.log(`  🎥 Zoom link: ${zoomLink.substring(0, 50)}...`);
      } else {
        console.log(`  🎥 No Zoom link found`);
      }
      
      // Check for "See Docket" button
      const hasDocketBtn = html.includes('See Docket');
      console.log(`  📋 "See Docket" button: ${hasDocketBtn}`);
      
      // Look for table or grid structure
      const tables = $('table').length;
      const gridViews = $('[id*="grid"], [id*="Grid"], [class*="grid"]').length;
      console.log(`  📊 Tables found: ${tables}`);
      console.log(`  📊 Grid elements: ${gridViews}`);
      
      // Look for specific IDs/classes
      const billsPanel = $('#pageBody_pnlBills, #pnlBills').length;
      const agendaPanel = $('#pageBody_pnlAgenda, #pnlAgenda').length;
      const docketPanel = $('#pageBody_pnlDocket, #pnlDocket').length;
      console.log(`  🎯 Bills panel: ${billsPanel > 0}`);
      console.log(`  🎯 Agenda panel: ${agendaPanel > 0}`);
      console.log(`  🎯 Docket panel: ${docketPanel > 0}`);
      
      // Delay to respect rate limiting
      await new Promise(resolve => setTimeout(resolve, 600));
      
    } catch (error: any) {
      console.error(`  ❌ Error: ${error.message}`);
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('\n✅ Analysis complete!');
}

testMultipleDockets().catch(console.error);
