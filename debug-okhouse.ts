import { scrapeWithPuppeteer } from './netlify/functions/utils/scrapers/puppeteer-helper';

async function debugOKHouse() {
  const start = new Date();
  const end = new Date();
  end.setMonth(end.getMonth() + 3);
  
  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];
  
  const url = `https://www.okhouse.gov/calendars?start=${startStr}&end=${endStr}`;
  
  console.log(`Fetching: ${url}\n`);
  
  const result = await scrapeWithPuppeteer(url, {
    waitFor: 5000,
    evaluate: async (page) => {
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      return await page.evaluate(() => {
        // Debug: check what elements exist
        const debug = {
          articles: document.querySelectorAll('article').length,
          h4s: document.querySelectorAll('h4').length,
          times: document.querySelectorAll('time').length,
          allText: document.body.textContent?.substring(0, 500)
        };
        
        console.log('Debug info:', debug);
        
        const eventData: any[] = [];
        const articles = document.querySelectorAll('article');
        
        console.log(`Found ${articles.length} article elements`);
        
        articles.forEach((article, index) => {
          const h4 = article.querySelector('h4');
          const timeElem = article.querySelector('time');
          
          console.log(`Article ${index}:`, {
            hasH4: !!h4,
            h4Text: h4?.textContent,
            hasTime: !!timeElem,
            timeText: timeElem?.textContent
          });
          
          const title = h4?.textContent?.trim();
          const dateTime = timeElem?.textContent?.trim();
          const location = Array.from(article.querySelectorAll('p'))
            .find(p => p.textContent?.includes('ROOM'))?.textContent?.trim();
          
          let committeeUrl: string | undefined;
          let meetingNoticeUrl: string | undefined;
          
          article.querySelectorAll('a').forEach(link => {
            const href = (link as HTMLAnchorElement).href;
            const text = link.textContent?.trim();
            
            if (text?.includes('Meeting Notice') && href?.includes('.pdf')) {
              meetingNoticeUrl = href;
            } else if (href?.includes('/committees/')) {
              committeeUrl = href;
            }
          });
          
          if (title) {
            eventData.push({
              title,
              dateTime: dateTime || 'NO TIME',
              location: location || 'State Capitol',
              committeeUrl,
              meetingNoticeUrl
            });
          }
        });
        
        return { debug, eventData };
      });
    }
  });
  
  console.log('\nResult:', JSON.stringify(result, null, 2));
}

debugOKHouse().catch(console.error);
