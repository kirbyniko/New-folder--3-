import { BaseScraper, RawEvent } from '../base-scraper';
import { enrichEventMetadata } from '../shared/tagging';
import * as cheerio from 'cheerio';
import { scrapeLasVegasMeetings } from '../local/las-vegas.js';

/**
 * Nevada Legislature Calendar Scraper
 * URL: https://www.leg.state.nv.us/App/Calendar/A/
 * Method: Static HTML parsing with Cheerio
 * Note: Nevada meets biennially (odd years), interim committees meet between sessions
 * Uses shared tagging system for topic categorization and public participation detection
 */

export class NevadaScraper extends BaseScraper {
  constructor() {
    super({
      stateCode: 'NV',
      stateName: 'Nevada',
      websiteUrl: 'https://www.leg.state.nv.us',
      reliability: 'high',
      updateFrequency: 24
    });
  }

  getCalendarSources(): { name: string; url: string; description: string }[] {
    return [
      {
        name: 'Nevada Legislature Calendar',
        url: 'https://www.leg.state.nv.us/App/Calendar/A/',
        description: 'Assembly and Senate committee meeting schedules'
      },
      {
        name: 'Local City Meetings (Legistar API)',
        url: 'https://webapi.legistar.com',
        description: 'Las Vegas city council meetings'
      }
    ];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    console.log('[SCRAPER:NV] 📅 Starting Nevada calendar scrape');
    
    const url = 'https://www.leg.state.nv.us/App/Calendar/A/';
    
    try {
      const html = await this.fetchPage(url);
      const $ = cheerio.load(html);
      const events: RawEvent[] = [];
      
      let currentDate = '';
      
      // Parse event sections
      $('.padTop.padBottom').each((_, elem) => {
        try {
          const $section = $(elem);
          
          // Check if this is a date header (previous sibling)
          const $prev = $section.prev();
          if ($prev.hasClass('BGazure') && $prev.hasClass('fBold')) {
            // Extract date from header like "Wednesday, December 17, 2025"
            const dateText = $prev.text().trim().replace(/<hr[^>]*>/, '').trim();
            const dateMatch = dateText.match(/([A-Za-z]+day),\s+([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})/);
            if (dateMatch) {
              currentDate = dateMatch[0]; // Full date string
            }
          }
          
          if (!currentDate) return;
          
          // Extract time
          const timeElem = $section.find('.col-md-2.ACenter.fBold').first();
          const time = timeElem.contents().first().text().trim(); // "1:00 PM"
          
          // Extract committee name and link
          const nameElem = $section.find('.BlueBold').first();
          const nameLink = nameElem.parent('a');
          const name = nameElem.text().trim();
          const detailUrl = nameLink.attr('href');
          
          // If no link, might be a board meeting without href
          const fallbackName = $section.find('.BlackBold').first().text().trim();
          const finalName = name || fallbackName;
          
          if (!finalName) return;
          
          // Extract location
          const locationList = $section.find('.LocationMargin li');
          const locations: string[] = [];
          locationList.each((_, li) => {
            const loc = $(li).text().trim();
            if (loc && !loc.startsWith('Videoconferenced')) {
              locations.push(loc);
            }
          });
          
          const location = locations[0] || 'Nevada Legislature';
          
          // Extract videoconference info and agenda viewer
          let virtualMeetingUrl: string | null = null;
          let agendaViewerUrl: string | null = null;
          
          const videoLink = $section.find('a[href*="youtube.com"]').attr('href');
          if (videoLink) {
            virtualMeetingUrl = videoLink;
          }
          
          // Check for Sliq Harmony viewer (contains agenda/video)
          const viewerLink = $section.find('a[href*="sliq.net"]').attr('href');
          if (viewerLink) {
            agendaViewerUrl = viewerLink;
          }
          
          // Parse date
          const date = this.parseNevadaDate(currentDate, time);
          if (!date) {
            console.log(`[SCRAPER:NV] ⚠️ Could not parse date: ${currentDate} ${time}`);
            return;
          }
          
          // Extract committee name (before " - " or use full name)
          let committee = finalName;
          const committeeMatch = finalName.match(/^(.*?)\s*(?:-|–)\s/);
          if (committeeMatch) {
            committee = committeeMatch[1].trim();
          }
          
          // Build description with meeting context
          let description = `Nevada Legislature ${committee}`;
          const nameLower = finalName.toLowerCase();
          
          // Identify key meeting characteristics
          const characteristics: string[] = [];
          if (nameLower.includes('vote') || nameLower.includes('voting')) {
            characteristics.push('voting session');
          }
          if (nameLower.includes('public comment') || nameLower.includes('public hearing')) {
            characteristics.push('public comment period');
          }
          if (nameLower.includes('budget') || nameLower.includes('appropriation')) {
            characteristics.push('budget discussion');
          }
          if (nameLower.includes('work session')) {
            characteristics.push('work session');
          }
          if (agendaViewerUrl) {
            characteristics.push('agenda viewer available');
          }
          
          if (characteristics.length > 0) {
            description += ` (${characteristics.join(', ')})`;
          }
          
          // Build event
          const event: RawEvent = {
            id: `nv-${date.getTime()}-${this.sanitizeForId(finalName)}`,
            name: finalName,
            date: date.toISOString(),
            time,
            location,
            committee,
            type: 'committee-meeting',
            level: 'state',
            state: 'NV',
            city: location.includes('Carson City') ? 'Carson City' : 'Las Vegas',
            lat: location.includes('Carson City') ? 39.1638 : 36.1716,
            lng: location.includes('Carson City') ? -119.7674 : -115.1391,
            zipCode: null,
            description,
            sourceUrl: detailUrl ? (detailUrl.startsWith('http') ? detailUrl : `https://www.leg.state.nv.us${detailUrl}`) : url,
            virtualMeetingUrl: virtualMeetingUrl || agendaViewerUrl, // Use Sliq viewer if no YouTube
            docketUrl: agendaViewerUrl || (detailUrl ? (detailUrl.startsWith('http') ? detailUrl : `https://www.leg.state.nv.us${detailUrl}`) : null)
          };
          
          // Apply unified tagging and participation detection
          enrichEventMetadata(event, description);
          
          events.push(event);
          console.log(`[SCRAPER:NV] ✓ ${finalName} - ${currentDate} ${time}`);
          
        } catch (err) {
          console.error('[SCRAPER:NV] Error parsing event:', err);
        }
      });
      
      // Filter future events only
      // Filter out past events (using start of day for consistency with other scrapers)
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const futureEvents = events.filter(e => {
        const eventDate = new Date(e.date);
        if (eventDate >= today) {
          return true;
        } else {
          console.log(`[SCRAPER:NV] Skipping past event: ${e.name} on ${e.date}`);
          return false;
        }
      });
      
      console.log(`[SCRAPER:NV] Found ${futureEvents.length} upcoming events (${events.length} total)`);
      
      // Enhance events with agenda details (async, with rate limiting)
      // Only fetch details for events that likely have useful info (first 10 upcoming)
      console.log('[SCRAPER:NV] 📋 Fetching agenda details for upcoming meetings...');
      const eventsToEnhance = futureEvents.slice(0, 10);
      const eventsToSkip = futureEvents.slice(10);
      
      const enhancedEvents: RawEvent[] = [];
      for (const event of eventsToEnhance) {
        const enhanced = await this.enhanceWithAgendaDetails(event);
        enhancedEvents.push(enhanced);
        // Small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      return [...enhancedEvents, ...eventsToSkip];
      
    } catch (error) {
      console.error('[SCRAPER:NV] Failed to scrape Nevada', error);
      throw error;
    }
  }
  
  /**
   * Parse Nevada date format: "Wednesday, December 17, 2025" + "1:00 PM"
   */
  private parseNevadaDate(dateStr: string, timeStr: string): Date | null {
    try {
      // Extract: "December 17, 2025"
      const match = dateStr.match(/([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})/);
      if (!match) return null;
      
      const [, month, day, year] = match;
      
      // Parse time
      const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*([AP]M)/i);
      if (!timeMatch) return null;
      
      let hour = parseInt(timeMatch[1]);
      const minute = parseInt(timeMatch[2]);
      const meridiem = timeMatch[3].toUpperCase();
      
      // Convert to 24-hour
      if (meridiem === 'PM' && hour !== 12) hour += 12;
      if (meridiem === 'AM' && hour === 12) hour = 0;
      
      // Month name to number
      const months: Record<string, number> = {
        'January': 0, 'February': 1, 'March': 2, 'April': 3,
        'May': 4, 'June': 5, 'July': 6, 'August': 7,
        'September': 8, 'October': 9, 'November': 10, 'December': 11
      };
      
      const monthNum = months[month];
      if (monthNum === undefined) return null;
      
      return new Date(parseInt(year), monthNum, parseInt(day), hour, minute);
      
    } catch (err) {
      console.error('[SCRAPER:NV] Date parse error:', err);
      return null;
    }
  }
  
  /**
   * Enhance event with agenda details from meeting page
   */
  private async enhanceWithAgendaDetails(event: RawEvent): Promise<RawEvent> {
    // Only fetch if we have a detail URL that's different from sourceUrl
    if (!event.sourceUrl || !event.sourceUrl.includes('/Meeting/')) {
      return event;
    }
    
    try {
      const html = await this.fetchPage(event.sourceUrl);
      const $ = cheerio.load(html);
      const pageText = $('body').text();
      
      // Extract bill references (AB, SB, ACR, SCR, AJR, SJR)
      const billMatches = pageText.match(/\b(AB|SB|ACR|SCR|AJR|SJR)\s*\d+/gi);
      const bills: Array<{ number: string; title: string }> = [];
      
      if (billMatches && billMatches.length > 0) {
        const uniqueBills = [...new Set(billMatches)];
        uniqueBills.forEach(billNum => {
          bills.push({
            number: billNum.toUpperCase(),
            title: `Nevada ${billNum.toUpperCase()}`
          });
        });
      }
      
      // Look for agenda-related keywords in the page
      const agendaInfo: string[] = [];
      
      if (pageText.toLowerCase().includes('public comment')) {
        agendaInfo.push('Public comment period');
      }
      if (pageText.toLowerCase().includes('vote') || pageText.toLowerCase().includes('voting')) {
        agendaInfo.push('Voting on items');
      }
      if (pageText.match(/\b(action|approve|adopt|consider)\b/i)) {
        agendaInfo.push('Action items');
      }
      
      // Update description if we found additional info
      let enhancedDescription = event.description;
      if (bills.length > 0) {
        const billList = bills.slice(0, 5).map(b => b.number).join(', ');
        const moreText = bills.length > 5 ? `, +${bills.length - 5} more` : '';
        enhancedDescription += ` | Bills: ${billList}${moreText}`;
      }
      if (agendaInfo.length > 0) {
        enhancedDescription += ` | ${agendaInfo.join(', ')}`;
      }
      
      return {
        ...event,
        description: enhancedDescription,
        bills: bills.length > 0 ? bills : undefined
      };
      
    } catch (error) {
      console.log(`[SCRAPER:NV] ⚠️ Could not fetch agenda details for ${event.name}:`, error);
      return event;
    }
  }
  
  private sanitizeForId(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  }
}
