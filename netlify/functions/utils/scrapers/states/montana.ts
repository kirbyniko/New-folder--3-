import { BaseScraper, ScraperConfig } from '../base-scraper';
import { RawEvent, CalendarSource } from '../../../types/events';
import { scrapeWithPuppeteer } from '../puppeteer-helper';

interface MontanaEvent {
  title: string;
  url: string;
  dateStr: string;
  timeStr: string;
  location?: string;
}

export class MontanaScraper extends BaseScraper {
  constructor() {
    super({
      stateCode: 'MT',
      stateName: 'Montana',
      capitolCity: 'Helena',
      capitolCoordinates: { lat: 46.5891, lng: -112.0391 }
    });
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    const url = 'https://www.legmt.gov/events/';
    
    console.log('🎭 MONTANA PUPPETEER SCRAPER STARTING');
    console.log('🌐 Scraping URL:', url);
    
    try {
      const events = await scrapeWithPuppeteer<MontanaEvent[]>(url, {
        waitFor: 5000, // Wait for calendar to render
        evaluate: async (page) => {
          // Wait for calendar to load
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          console.log('🔍 Montana calendar loaded, navigating to January...');
          
          // Click "Next Month" to get to January 2026
          try {
            const nextButton = await page.$('.tribe-events-c-nav__next a, a[title*="Next month"], .tribe-events-button-next');
            if (nextButton) {
              await nextButton.click();
              console.log('✅ Clicked Next Month button');
              await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for January to load
            }
          } catch (err) {
            console.log('⚠️ Could not find Next Month button:', err);
          }
          
          console.log('🔍 Extracting January events...');
          
          // Extract events from the rendered page
          const eventData = await page.evaluate(() => {
            const events: any[] = [];
            
            // Look for event links in the calendar
            const eventLinks = document.querySelectorAll('a[href*="/event/"]');
            
            console.log(`Found ${eventLinks.length} event links`);
            
            eventLinks.forEach((link) => {
              try {
                const title = link.textContent?.trim() || '';
                const url = (link as HTMLAnchorElement).href;
                
                // Skip navigation links
                if (!title || title.length < 3) return;
                
                // Look for date/time in parent context
                const parent = link.closest('article, li, div.event-item, .tribe-event, .type-tribe_events');
                let dateStr = '';
                let timeStr = '';
                let location = '';
                
                if (parent) {
                  // Extract date from structured elements or text
                  const dateEl = parent.querySelector('.tribe-event-date-start, time, .event-date');
                  if (dateEl) {
                    dateStr = dateEl.textContent?.trim() || dateEl.getAttribute('datetime') || '';
                  }
                  
                  // Extract time
                  const timeEl = parent.querySelector('.tribe-event-time, .event-time');
                  if (timeEl) {
                    timeStr = timeEl.textContent?.trim() || '';
                  }
                  
                  // Extract location
                  const locEl = parent.querySelector('.tribe-events-venue, .event-location, .location');
                  if (locEl) {
                    location = locEl.textContent?.trim() || '';
                  }
                  
                  // Fallback: parse from parent text
                  if (!dateStr) {
                    const parentText = parent.textContent || '';
                    const dateMatch = parentText.match(/([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/);
                    if (dateMatch) dateStr = dateMatch[1];
                  }
                  
                  if (!timeStr) {
                    const parentText = parent.textContent || '';
                    const timeMatch = parentText.match(/(\d{1,2}:\d{2}\s*[ap]m)\s*-\s*(\d{1,2}:\d{2}\s*[ap]m)/i);
                    if (timeMatch) timeStr = `${timeMatch[1]} - ${timeMatch[2]}`;
                  }
                }
                
                if (title && url && dateStr) {
                  events.push({
                    title: title.substring(0, 200),
                    url,
                    dateStr,
                    timeStr: timeStr || '8:00 am',
                    location: location || 'State Capitol'
                  });
                }
              } catch (err) {
                console.error('Error processing event:', err);
              }
            });
            
            return events;
          });
          
          console.log(`✅ Extracted ${eventData.length} January events`);
          return eventData;
        }
      });
      
      console.log(`📊 Puppeteer returned ${events.length} events`);
      
      // Convert to RawEvents
      const rawEvents: RawEvent[] = [];
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      for (const event of events) {
        try {
          const eventDate = this.parseDate(event.dateStr);
          if (!eventDate || eventDate < today) continue;
          
          const committee = this.extractCommittee(event.title);
          
          rawEvents.push({
            id: `mt-${eventDate.getTime()}-${committee.toLowerCase().replace(/\s+/g, '-')}`,
            name: event.title,
            date: eventDate.toISOString(),
            time: this.formatTime(event.timeStr),
            location: event.location || 'State Capitol, Helena, MT',
            committee,
            type: 'committee-meeting',
            level: 'state',
            state: 'MT',
            city: 'Helena',
            lat: 46.5891,
            lng: -112.0391,
            zipCode: null,
            description: `${committee} meeting`,
            sourceUrl: 'https://www.legmt.gov/events/',
            docketUrl: event.url, // Link to individual event page
            virtualMeetingUrl: null,
            bills: []
          });
        } catch (err) {
          console.error('Error processing Montana event:', err, event);
        }
      }
      
      console.log(`✅ Returning ${rawEvents.length} upcoming Montana events`);
      return rawEvents;
      
    } catch (error) {
      console.error('❌ Montana Puppeteer scraper failed:', error);
      return [];
    }
  }

  private parseDate(dateStr: string): Date | null {
    try {
      // Handle formats like:
      // "January 5, 2026"
      // "Jan 5 2026"
      // "1/5/2026"
      const cleaned = dateStr.trim();
      
      // Try direct parsing first
      const date = new Date(cleaned);
      if (!isNaN(date.getTime())) {
        return date;
      }
      
      // Try pattern matching
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
      const monthAbbr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      // Match "Month Day, Year" or "Mon Day Year"
      const match = cleaned.match(/([A-Z][a-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
      if (match) {
        const monthStr = match[1];
        const day = parseInt(match[2]);
        const year = parseInt(match[3]);
        
        let month = monthNames.indexOf(monthStr);
        if (month === -1) month = monthAbbr.indexOf(monthStr);
        
        if (month !== -1) {
          return new Date(year, month, day);
        }
      }
      
      return null;
    } catch {
      return null;
    }
  }

  private formatTime(timeStr: string): string {
    // Already in format like "8:00 am - 5:00 pm" or "8:00 am"
    return timeStr || '8:00 AM';
  }

  private extractCommittee(title: string): string {
    // Clean up common suffixes
    return title
      .replace(/\s*-\s*\d+\s*$/, '') // Remove trailing " - 10"
      .replace(/\s*meeting$/i, '')
      .trim();
  }

  getCalendarSources(): CalendarSource[] {
    return [
      {
        name: 'Montana Legislature Events Calendar',
        url: 'https://www.legmt.gov/events/',
        type: 'primary' as const,
        lastChecked: new Date().toISOString(),
        status: 'active' as const,
        notes: 'Official legislative events calendar (interim committees)'
      },
      {
        name: 'Local City Meetings (Legistar API)',
        url: 'https://webapi.legistar.com',
        type: 'supplementary' as const,
        lastChecked: new Date().toISOString(),
        status: 'active' as const,
        notes: 'City council meetings from Billings, Missoula, and other Montana cities'
      }
    ];
  }
}
