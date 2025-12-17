import { scrapeWithPuppeteer } from './netlify/functions/utils/scrapers/puppeteer-helper';

async function inspectLexingtonCalendar() {
  console.log('=== Inspecting Lexington Calendar Structure ===\n');
  
  const url = 'https://www.lexingtonky.gov/calendar';
  
  try {
    const result = await scrapeWithPuppeteer(url, {
      waitFor: 3000, // Wait for calendar to render
      evaluate: async (page) => {
        // Wait a bit more for any dynamic content
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Get page HTML structure
        const html = await page.content();
        console.log('Page loaded, HTML length:', html.length);
        
        // Try to find calendar events - focus on actual event links
        const events = await page.evaluate(() => {
          const eventLinks = Array.from(document.querySelectorAll('a[href*="/calendar/20"]'))
            .filter(el => {
              const href = (el as HTMLAnchorElement).href;
              // Filter to actual event pages (not just month/day views)
              return href.includes('/calendar/2') && href.split('/').length > 5;
            })
            .slice(0, 10) // Get first 10 events
            .map(el => ({
              title: el.textContent?.trim() || 'No title',
              url: (el as HTMLAnchorElement).href,
              parent: el.parentElement?.textContent?.trim().substring(0, 150)
            }));
          
          return eventLinks;
        });
        
        return { events, htmlLength: html.length };
      }
    });
    
    console.log('\n✅ Calendar inspection complete!\n');
    console.log(`Found ${result.events.length} event links:\n`);
    
    if (result.events.length === 0) {
      console.log('❌ No event links found');
    } else {
      result.events.forEach((event: any, i: number) => {
        console.log(`${i + 1}. ${event.title}`);
        console.log(`   URL: ${event.url}`);
        console.log(`   Context: ${event.parent?.substring(0, 100)}...`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error inspecting calendar:', error);
    throw error;
  }
}

inspectLexingtonCalendar();
