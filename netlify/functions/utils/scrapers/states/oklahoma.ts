import { BaseScraper, type RawEvent } from '../base-scraper';
import { enrichEventMetadata } from '../shared/tagging';
import { scrapeWithPuppeteer } from '../puppeteer-helper';

const CAPITOL_COORDS = {
  lat: 35.4922,
  lng: -97.5034
};

interface OKHouseEvent {
  title: string;
  dateTime: string;
  location: string;
  committeeUrl?: string;
  meetingNoticeUrl?: string;
}

/**
 * Scraper for Oklahoma Legislature
 * Uses OK House calendar (Puppeteer for dynamic content)
 * Source: https://www.okhouse.gov/calendars
 */
export class OklahomaScraper extends BaseScraper {
  constructor() {
    super({
      stateCode: 'OK',
      stateName: 'Oklahoma',
      websiteUrl: 'https://www.okhouse.gov/calendars',
      reliability: 'high',
      updateFrequency: 24
    });
  }

  getCalendarSources(): { name: string; url: string; description: string }[] {
    return [
      {
        name: 'Oklahoma House Calendar',
        url: 'https://www.okhouse.gov/calendars',
        description: 'House committee meetings and floor schedules'
      },
      {
        name: 'Local City Meetings (Legistar API)',
        url: 'https://webapi.legistar.com',
        description: 'Oklahoma City and Tulsa city council meetings'
      }
    ];
  }
  
  async scrapeCalendar(): Promise<RawEvent[]> {
    console.log('[SCRAPER:OK] Fetching Oklahoma House calendar...');
    
    try {
      // Get date range: today to 3 months out
      const start = new Date();
      const end = new Date();
      end.setMonth(end.getMonth() + 3);
      
      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];
      
      const url = `https://www.okhouse.gov/calendars?start=${startStr}&end=${endStr}`;
      
      const events = await scrapeWithPuppeteer(url, {
        waitFor: 3000,
        evaluate: async (page) => {
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          return await page.evaluate(() => {
            const eventData: any[] = [];
            const articles = document.querySelectorAll('article');
            
            articles.forEach(article => {
              const title = article.querySelector('h4')?.textContent?.trim();
              const timeElem = article.querySelector('time');
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
                  dateTime: dateTime || '',
                  location: location || 'State Capitol',
                  committeeUrl,
                  meetingNoticeUrl
                });
              }
            });
            
            return eventData;
          });
        }
      });
      
      console.log(`[SCRAPER:OK] Found ${events.length} Oklahoma House events`);
      
      // Parse events and extract bills from PDFs
      const parsedEvents: RawEvent[] = [];
      for (const event of events) {
        const rawEvent = await this.parseOKHouseEvent(event);
        parsedEvents.push(rawEvent);
      }
      
      return parsedEvents;
      
    } catch (error) {
      console.error('[SCRAPER:OK] Error scraping calendar:', error);
      return [];
    }
  }
  
  /**
   * Extract bill numbers from meeting notice PDF
   */
  private async extractBillsFromPDF(pdfUrl: string): Promise<string[]> {
    try {
      // Lazy load pdfjs-dist only when needed (avoids Node.js compatibility issues)
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        return [];
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      
      const loadingTask = pdfjsLib.getDocument({ data });
      const pdf = await loadingTask.promise;
      
      let fullText = '';
      
      // Extract text from all pages
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }
      
      // Extract bill numbers (HB #### or SB ####)
      const billMatches = fullText.match(/[HS]B\s*\d{1,5}/gi);
      if (billMatches) {
        const uniqueBills = [...new Set(billMatches.map(b => b.replace(/\s+/g, ' ').toUpperCase()))];
        return uniqueBills;
      }
      
      return [];
      
    } catch (error) {
      console.error(`[SCRAPER:OK] Error extracting bills from PDF: ${error}`);
      return [];
    }
  }
  
  private async parseOKHouseEvent(event: OKHouseEvent): Promise<RawEvent> {
    // Parse date and time from meeting notice filename
    // Format: CMN-AP-NATUR-20251217-09000000.pdf
    // Date: 20251217 = Dec 17, 2025
    // Time: 09000000 = 09:00:00 (9:00 AM)
    let dateStr = 'TBD';
    let timeStr = 'TBD';
    let bills: string[] = [];
    
    if (event.meetingNoticeUrl) {
      const filenameMatch = event.meetingNoticeUrl.match(/(\d{8})-(\d{8})\.pdf$/);
      if (filenameMatch) {
        const dateCode = filenameMatch[1]; // "20251217"
        const timeCode = filenameMatch[2]; // "09000000"
        
        // Parse date: YYYYMMDD
        const year = dateCode.substring(0, 4);
        const month = parseInt(dateCode.substring(4, 6)) - 1; // 0-indexed
        const day = dateCode.substring(6, 8);
        
        const date = new Date(parseInt(year), month, parseInt(day));
        dateStr = date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        
        // Parse time: HHMMSS00
        const hour = parseInt(timeCode.substring(0, 2));
        const minute = timeCode.substring(2, 4);
        
        const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        const ampm = hour >= 12 ? 'PM' : 'AM';
        timeStr = `${hour12}:${minute} ${ampm}`;
      }
    }
    
    // Extract bills from meeting notice PDF
    if (event.meetingNoticeUrl) {
      console.log(`[SCRAPER:OK] Extracting bills from: ${event.meetingNoticeUrl}`);
      bills = await this.extractBillsFromPDF(event.meetingNoticeUrl);
      if (bills.length > 0) {
        console.log(`[SCRAPER:OK] Found ${bills.length} bills: ${bills.join(', ')}`);
      }
    }
    
    // Generate ID from committee name and date
    const timestamp = Date.now();
    const titleHash = event.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const id = `ok-${timestamp}-${titleHash}`;
    
    // Use committee page as sourceUrl (most specific), fallback to calendar
    const sourceUrl = event.committeeUrl || 'https://www.okhouse.gov/calendars';
    
    // Convert bill strings to BillInfo objects
    const billInfos = bills.map(billNumber => ({
      id: billNumber,
      title: billNumber,
      url: `https://www.oklegislature.gov/BillInfo.aspx?Bill=${billNumber.replace(' ', '')}`
    }));
    
    return {
      id: id,
      name: event.title,
      title: event.title,
      date: dateStr,
      time: timeStr,
      location: event.location,
      committee: event.title,
      type: 'Committee Meeting',
      level: 'state' as const,
      state: 'OK',
      city: 'Oklahoma City',
      lat: CAPITOL_COORDS.lat,
      lng: CAPITOL_COORDS.lng,
      zipCode: '73105',
      description: event.meetingNoticeUrl 
        ? `Meeting notice: ${event.meetingNoticeUrl}`
        : '',
      sourceUrl: sourceUrl,
      virtualMeetingUrl: undefined,
      bills: billInfos
    };
  }
}
