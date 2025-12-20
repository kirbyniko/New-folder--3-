import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function researchIowa() {
  console.log('Researching Iowa Legislature...\n');
  
  const urls = [
    'https://www.legis.iowa.gov/committees/meetings/meetingsListComm',
    'https://www.legis.iowa.gov/committees/meetings',
    'https://www.legis.iowa.gov/calendar',
  ];
  
  for (const url of urls) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Testing: ${url}`);
    console.log('='.repeat(80));
    
    try {
      const response = await fetch(url);
      console.log(`Status: ${response.status}`);
      
      if (response.status === 200) {
        const html = await response.text();
        const $ = cheerio.load(html);
        
        // Check if it's static HTML or JavaScript-rendered
        const bodyText = $('body').text().trim();
        const hasContent = bodyText.length > 1000;
        
        console.log(`Content length: ${bodyText.length} characters`);
        console.log(`Has substantial content: ${hasContent}`);
        
        // Look for meeting listings
        const meetingSelectors = [
          'table tr',
          '.meeting',
          '.event',
          '[class*="calendar"]',
          '[class*="meeting"]',
          '[class*="committee"]'
        ];
        
        let foundMeetings = false;
        for (const selector of meetingSelectors) {
          const elements = $(selector);
          if (elements.length > 0) {
            console.log(`Found ${elements.length} elements matching: ${selector}`);
            foundMeetings = true;
          }
        }
        
        if (!foundMeetings) {
          console.log('❌ No meeting elements found with common selectors');
        }
        
        // Check for API endpoints
        const scriptTags = $('script').map((_, el) => $(el).html()).get().join(' ');
        const apiMatches = scriptTags.match(/api[^"'\s]*/gi);
        if (apiMatches) {
          console.log(`Found API references: ${[...new Set(apiMatches)].slice(0, 5).join(', ')}`);
        }
        
        // Check for JSON endpoints
        const jsonMatches = html.match(/https?:\/\/[^"'\s]*\.json[^"'\s]*/gi);
        if (jsonMatches) {
          console.log(`Found JSON endpoints: ${[...new Set(jsonMatches)].slice(0, 3).join(', ')}`);
        }
      }
      
    } catch (error: any) {
      console.error(`Error: ${error.message}`);
    }
  }
}

researchIowa().catch(console.error);
