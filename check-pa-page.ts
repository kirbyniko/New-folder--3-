import 'dotenv/config';
import { parseHTML } from './netlify/functions/utils/scrapers/html-parser';

async function checkPAPage() {
  console.log('🔍 Checking PA House meeting schedule page...\n');
  
  const url = 'https://www.palegis.us/house/committees/meeting-schedule';
  
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = parseHTML(html);
    
    console.log('📄 Page loaded successfully\n');
    
    // Check for meeting blocks
    const meetingDivs = $('div.meetings[data-date]');
    console.log(`Found ${meetingDivs.length} date blocks\n`);
    
    // Get first meeting as sample
    const firstDateBlock = meetingDivs.first();
    const dateText = firstDateBlock.find('.h4').text().trim();
    console.log(`Sample date: ${dateText}\n`);
    
    const firstMeeting = firstDateBlock.find('.meeting').first();
    if (firstMeeting.length > 0) {
      const committee = firstMeeting.find('a.committee').text().trim();
      const fullText = firstMeeting.text().trim();
      const html = firstMeeting.html();
      
      console.log('=== SAMPLE MEETING ===');
      console.log(`Committee: ${committee}`);
      console.log(`\nFull Text:\n${fullText.substring(0, 500)}...\n`);
      console.log(`\nHTML:\n${html?.substring(0, 800)}...\n`);
      
      // Check for bill patterns
      const linkPattern = /href=['"](https?:\/\/[^'"]*\/legislation\/bills\/(\d{4})\/([hs][br])(\d+))['"][^>]*>(\d+)<\/a>/gi;
      const billPattern = /\b([HS]B)\s+(\d+)\b/gi;
      
      const linkMatches = html?.match(linkPattern);
      const textMatches = fullText.match(billPattern);
      
      console.log(`Bill link matches: ${linkMatches?.length || 0}`);
      console.log(`Bill text matches: ${textMatches?.length || 0}`);
      
      if (linkMatches && linkMatches.length > 0) {
        console.log('\nSample bill links:', linkMatches.slice(0, 3));
      }
      
      if (textMatches && textMatches.length > 0) {
        console.log('\nSample bill text:', textMatches.slice(0, 3));
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkPAPage();
