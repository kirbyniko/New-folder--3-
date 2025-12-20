import puppeteer from 'puppeteer';

async function checkCalendar() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // December 2025
  const decUrl = 'https://www.dsm.city/calendar.php?view=list&calendar=5&month=12&day=01&year=2025';
  await page.goto(decUrl, { waitUntil: 'networkidle0' });
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const decEvents = await page.evaluate(() => {
    const events: any[] = [];
    const elements = Array.from(document.querySelectorAll('.fc-event'));
    
    elements.forEach((el: any) => {
      const titleEl = el.querySelector('.fc-list-event-title a, .fc-list-event-title');
      const title = titleEl?.textContent?.trim() || '';
      
      const timeEl = el.querySelector('.fc-list-event-time');
      const time = timeEl?.textContent?.trim() || '';
      
      let date = '';
      let currentEl = el.parentElement;
      while (currentEl && !date) {
        const dayEl = currentEl.querySelector('.fc-list-day-text');
        if (dayEl) {
          date = dayEl.textContent?.trim() || '';
          break;
        }
        currentEl = currentEl.previousElementSibling;
      }
      
      if (title) {
        events.push({ date, time, title });
      }
    });
    
    return events;
  });
  
  await browser.close();
  
  console.log('\n=== DECEMBER 2025 MEETINGS ===');
  console.log(`Found ${decEvents.length} events:\n`);
  decEvents.forEach(evt => {
    console.log(`${evt.date}`);
    console.log(`  ${evt.time} - ${evt.title}\n`);
  });
}

checkCalendar().catch(console.error);
