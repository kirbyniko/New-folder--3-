import { scrapeWithPuppeteer } from './netlify/functions/utils/scrapers/puppeteer-helper';

async function testOKHouseCalendar() {
  const url = 'https://www.okhouse.gov/calendars?start=2025-12-17&end=2026-01-31';
  
  const events = await scrapeWithPuppeteer(url, {
    waitFor: 3000,
    evaluate: async (page) => {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      return await page.evaluate(() => {
        const eventData: any[] = [];
        
        // Find all event articles
        const articles = document.querySelectorAll('article');
        
        articles.forEach(article => {
          const title = article.querySelector('h4')?.textContent?.trim();
          const dateTime = article.querySelector('time')?.textContent?.trim();
          const location = Array.from(article.querySelectorAll('p'))
            .find(p => p.textContent?.includes('ROOM'))?.textContent?.trim();
          
          const links: any = {};
          article.querySelectorAll('a').forEach(link => {
            const href = (link as HTMLAnchorElement).href;
            const text = link.textContent?.trim();
            
            if (text?.includes('Meeting Notice')) {
              links.meetingNotice = href;
            } else if (text?.includes('VIEW AGENDA')) {
              // The agenda might be a button that opens a modal
              const agendaBtn = link.getAttribute('data-agenda') || 
                               link.getAttribute('href');
              links.agenda = agendaBtn;
            } else if (text?.includes('VIEW DETAILS')) {
              links.details = href;
            } else if (href?.includes('/committees/')) {
              links.committee = href;
            }
          });
          
          if (title) {
            eventData.push({
              title,
              dateTime,
              location,
              links
            });
          }
        });
        
        return eventData;
      });
    }
  });
  
  console.log(`Found ${events.length} events:\n`);
  events.slice(0, 5).forEach((event: any, i: number) => {
    console.log(`${i + 1}. ${event.title}`);
    console.log(`   Date/Time: ${event.dateTime}`);
    console.log(`   Location: ${event.location}`);
    console.log(`   Links:`);
    Object.entries(event.links).forEach(([key, value]) => {
      console.log(`     ${key}: ${value}`);
    });
    console.log('');
  });
}

testOKHouseCalendar().catch(console.error);
