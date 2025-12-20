import { BaseScraper } from '../base-scraper';
import type { RawEvent } from '../../types';
import * as cheerio from 'cheerio';

/**
 * Iowa Legislature Public Hearings Scraper
 * URL: https://www.legis.iowa.gov/committees/publicHearings?ga=91
 * Method: Static HTML table parsing with Cheerio
 * Note: Iowa Legislature meets annually (January-April/May)
 * Returns 0 events when out of session (expected behavior)
 */

export class IowaScraper extends BaseScraper {
  private readonly currentGA = 91; // 91st General Assembly (2025-2026)
  
  constructor() {
    super({
      stateCode: 'IA',
      stateName: 'Iowa',
      websiteUrl: 'https://www.legis.iowa.gov',
      reliability: 'high',
      updateFrequency: 24
    });
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    console.log('[SCRAPER:IA] 📅 Starting Iowa calendar scrape');
    
    const url = `https://www.legis.iowa.gov/committees/publicHearings?ga=${this.currentGA}`;
    
    try {
      const html = await this.fetchPage(url);
      const $ = cheerio.load(html);
      const events: RawEvent[] = [];
      
      // Parse table rows
      $('table tr').each((_, row) => {
        try {
          const cells = $(row).find('td');
          if (cells.length < 6) return; // Skip header rows
          
          const dateText = $(cells[0]).text().trim();
          const location = $(cells[1]).text().trim();
          const billSubject = $(cells[2]).text().trim();
          const agendaText = $(cells[3]).text().trim();
          
          // Skip if no date or is header
          if (!dateText || dateText === 'Date') return;
          
          // Parse date: "04/23/2025 4:00 PM"
          const date = this.parseIowaDate(dateText);
          if (!date) {
            console.log(`[SCRAPER:IA] ⚠️ Could not parse date: ${dateText}`);
            return;
          }
          
          // Extract time from date text
          const timeMatch = dateText.match(/(\d{1,2}:\d{2}\s*[AP]M)/i);
          const time = timeMatch ? timeMatch[1] : '12:00 PM';
          
          // Get links
          const agendaLink = $(cells[3]).find('a').attr('href');
          const noticesLink = $(cells[4]).find('a').attr('href');
          
          // Build full URLs
          const baseUrl = 'https://www.legis.iowa.gov/committees/publicHearings';
          const docketUrl = noticesLink ? `${baseUrl}${noticesLink}` : null;
          
          // Build event name
          const name = `Public Hearing: ${billSubject}`;
          
          // Extract bill numbers
          const bills = this.extractBills(billSubject);
          
          // Build description
          let description = `Iowa Legislature Public Hearing on ${billSubject}`;
          if (agendaText && agendaText !== 'Agenda') {
            description += ` - ${agendaText}`;
          }
          
          const event: RawEvent = {
            id: `ia-${date.getTime()}-${this.sanitizeForId(billSubject)}`,
            name,
            date: date.toISOString(),
            time,
            location: this.parseLocation(location),
            committee: 'Public Hearing',
            type: 'public-hearing',
            level: 'state',
            state: 'IA',
            city: 'Des Moines',
            lat: 41.5868,
            lng: -93.6250,
            zipCode: null,
            description,
            sourceUrl: url,
            docketUrl,
            bills: bills.length > 0 ? bills : undefined
          };
          
          events.push(event);
          console.log(`[SCRAPER:IA] ✓ ${name} - ${dateText}`);
          
        } catch (err) {
          console.error('[SCRAPER:IA] Error parsing row:', err);
        }
      });
      
      // Filter future events only
      const now = new Date();
      const futureEvents = events.filter(e => new Date(e.date) >= now);
      
      if (futureEvents.length === 0) {
        console.log('[SCRAPER:IA] ℹ️ No upcoming hearings found (legislature may be out of session)');
      }
      
      console.log(`[SCRAPER:IA] Found ${futureEvents.length} future events (${events.length} total)`);
      return futureEvents;
      
    } catch (error) {
      console.error('[SCRAPER:IA] Failed to scrape Iowa', error);
      throw error;
    }
  }
  
  /**
   * Parse Iowa date format: "04/23/2025 4:00 PM"
   */
  private parseIowaDate(dateStr: string): Date | null {
    try {
      // Extract date and time
      const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*([AP]M)/i);
      if (!match) return null;
      
      const [, month, day, year, hour, minute, meridiem] = match;
      
      let hourNum = parseInt(hour);
      const minuteNum = parseInt(minute);
      
      // Convert to 24-hour
      if (meridiem.toUpperCase() === 'PM' && hourNum !== 12) hourNum += 12;
      if (meridiem.toUpperCase() === 'AM' && hourNum === 12) hourNum = 0;
      
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), hourNum, minuteNum);
      
    } catch (err) {
      console.error('[SCRAPER:IA] Date parse error:', err);
      return null;
    }
  }
  
  /**
   * Parse location (e.g., "RM 103" -> "Room 103, Iowa State Capitol")
   */
  private parseLocation(location: string): string {
    if (location.toUpperCase().startsWith('RM ')) {
      const roomNum = location.substring(3).trim();
      return `Room ${roomNum}, Iowa State Capitol, Des Moines, IA`;
    }
    return `${location}, Iowa State Capitol, Des Moines, IA`;
  }
  
  /**
   * Extract bill numbers from subject text
   */
  private extractBills(subject: string): Array<{ number: string; title: string }> {
    const bills: Array<{ number: string; title: string }> = [];
    
    // Match HF, SF, HSB, SSB, HCR, SCR, etc.
    const billMatches = subject.match(/\b(HF|SF|HSB|SSB|HCR|SCR|HJR|SJR)\s*\d+/gi);
    
    if (billMatches) {
      billMatches.forEach(billNum => {
        bills.push({
          number: billNum.toUpperCase().replace(/\s+/g, ' '),
          title: `Iowa ${billNum.toUpperCase()}`
        });
      });
    }
    
    return bills;
  }
  
  private sanitizeForId(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  }
}
