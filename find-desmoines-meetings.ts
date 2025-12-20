import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function findDesMoinesMeetings() {
  const urls = [
    'https://www.dsm.city/government/council_meetings_and_agendas/index.php',
    'https://www.dsm.city/government/council_meetings_and_agendas',
    'https://www.dsm.city/government/council',
    'https://www.cityofdesmoines.com',
  ];
  
  for (const url of urls) {
    console.log(`\nTesting: ${url}`);
    try {
      const response = await fetch(url, { redirect: 'follow' });
      console.log(`Status: ${response.status}`);
      console.log(`Final URL: ${response.url}`);
      
      if (response.status === 200) {
        const html = await response.text();
        const $ = cheerio.load(html);
        
        // Look for meeting calendar or agenda links
        const links = $('a').map((_, a) => ({
          text: $(a).text().trim().toLowerCase(),
          href: $(a).attr('href')
        })).get();
        
        const meetingLinks = links.filter(l => 
          l.text.includes('meeting') || 
          l.text.includes('agenda') || 
          l.text.includes('calendar') ||
          l.text.includes('council')
        ).slice(0, 10);
        
        if (meetingLinks.length > 0) {
          console.log('\nMeeting-related links found:');
          meetingLinks.forEach(l => console.log(`  ${l.text}: ${l.href}`));
        }
        
        return;
      }
    } catch (error: any) {
      console.log(`Error: ${error.message}`);
    }
  }
}

findDesMoinesMeetings().catch(console.error);
