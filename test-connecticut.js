import puppeteer from 'puppeteer';

(async () => {
  console.log('Launching browser to check Connecticut calendar...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Track network requests
  const apiRequests = [];
  page.on('request', request => {
    const url = request.url();
    if (url.includes('json') || url.includes('api') || url.includes('cal') || url.includes('event')) {
      apiRequests.push({
        url: url,
        method: request.method(),
        resourceType: request.resourceType()
      });
    }
  });
  
  // Track responses
  const apiResponses = [];
  page.on('response', async response => {
    const url = response.url();
    const contentType = response.headers()['content-type'] || '';
    
    if (contentType.includes('json') || url.includes('json') || url.includes('api')) {
      try {
        const responseBody = await response.text();
        apiResponses.push({
          url: url,
          status: response.status(),
          contentType: contentType,
          bodyPreview: responseBody.substring(0, 500)
        });
      } catch (e) {
        // Can't read body
      }
    }
  });
  
  console.log('\n=== Testing Main Calendar Page ===');
  await page.goto('https://www.cga.ct.gov/calendarofevents.asp', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Get page content
  const pageContent = await page.content();
  const hasCalendarDiv = pageContent.includes('fc-event') || pageContent.includes('calendar') || pageContent.includes('event');
  
  console.log('\nPage loaded. Calendar elements found:', hasCalendarDiv);
  console.log('\n=== API Requests Found ===');
  apiRequests.forEach(req => {
    console.log(`${req.method} ${req.url}`);
    console.log(`  Type: ${req.resourceType}`);
  });
  
  console.log('\n=== JSON Responses Found ===');
  apiResponses.forEach(resp => {
    console.log(`${resp.status} ${resp.url}`);
    console.log(`  Content-Type: ${resp.contentType}`);
    console.log(`  Preview: ${resp.bodyPreview.substring(0, 200)}`);
  });
  
  // Try to extract calendar events from the rendered page
  const events = await page.evaluate(() => {
    const eventElements = document.querySelectorAll('.fc-event, .event, [class*="event"]');
    return Array.from(eventElements).slice(0, 5).map(el => ({
      text: el.textContent?.trim().substring(0, 100),
      className: el.className,
      href: el.href || el.querySelector('a')?.href
    }));
  });
  
  console.log('\n=== Calendar Events Found on Page ===');
  console.log(JSON.stringify(events, null, 2));
  
  // Check the committee calendar too
  console.log('\n\n=== Testing Committee Calendar (Public Health) ===');
  apiRequests.length = 0;
  apiResponses.length = 0;
  
  await page.goto('https://www.cga.ct.gov/asp/menu/CGACommCal.asp?comm_code=ph', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('\n=== API Requests Found (Committee Calendar) ===');
  apiRequests.forEach(req => {
    console.log(`${req.method} ${req.url}`);
  });
  
  console.log('\n=== JSON Responses Found (Committee Calendar) ===');
  apiResponses.forEach(resp => {
    console.log(`${resp.status} ${resp.url}`);
    console.log(`  Content-Type: ${resp.contentType}`);
    console.log(`  Body: ${resp.bodyPreview}`);
  });
  
  // Check for FullCalendar or similar
  const calendarInfo = await page.evaluate(() => {
    return {
      hasFullCalendar: typeof window.FullCalendar !== 'undefined',
      calendarInstances: document.querySelectorAll('[class*="calendar"]').length,
      fcElements: document.querySelectorAll('[class^="fc-"]').length
    };
  });
  
  console.log('\n=== Calendar Library Info ===');
  console.log(JSON.stringify(calendarInfo, null, 2));
  
  // Save a screenshot
  await page.screenshot({ path: 'temp-ct-calendar.png', fullPage: true });
  console.log('\nScreenshot saved to temp-ct-calendar.png');
  
  await browser.close();
  console.log('\nBrowser closed.');
})();
