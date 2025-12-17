import { BaseScraper } from '../base-scraper';
import type { RawEvent } from '../../types';
import * as cheerio from 'cheerio';

/**
 * Nevada Legislature Calendar Scraper
 * URL: https://www.leg.state.nv.us/App/Calendar/A/
 * Method: Static HTML parsing with Cheerio
 * Note: Nevada meets biennially (odd years), interim committees meet between sessions
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
          
          // Extract videoconference info
          let virtualMeetingUrl: string | null = null;
          const videoLink = $section.find('a[href*="youtube.com"]').attr('href');
          if (videoLink) {
            virtualMeetingUrl = videoLink;
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
            description: `Nevada Legislature ${committee}`,
            sourceUrl: detailUrl ? (detailUrl.startsWith('http') ? detailUrl : `https://www.leg.state.nv.us${detailUrl}`) : url,
            virtualMeetingUrl,
            docketUrl: detailUrl ? (detailUrl.startsWith('http') ? detailUrl : `https://www.leg.state.nv.us${detailUrl}`) : null
          };
          
          events.push(event);
          console.log(`[SCRAPER:NV] ✓ ${finalName} - ${currentDate} ${time}`);
          
        } catch (err) {
          console.error('[SCRAPER:NV] Error parsing event:', err);
        }
      });
      
      // Filter future events only
      const now = new Date();
      const futureEvents = events.filter(e => new Date(e.date) >= now);
      
      console.log(`[SCRAPER:NV] Found ${futureEvents.length} future events (${events.length} total)`);
      return futureEvents;
      
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
  
  private sanitizeForId(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  }
}
