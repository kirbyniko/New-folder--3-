import { BaseScraper } from '../base-scraper';
import type { RawEvent, ScraperConfig } from '../base-scraper';
import { enrichEventMetadata } from '../shared/tagging';
import * as cheerio from 'cheerio';

interface KentuckyEvent {
  date: string;
  time: string;
  location: string;
  committee: string;
  committeeUrl: string;
  agenda?: string;
}

/**
 * Kentucky Legislature Scraper
 * Source: https://apps.legislature.ky.gov/legislativecalendar
 * 
 * Kentucky's legislative system:
 * - Static HTML with weekly committee meetings calendar
 * - Includes House, Senate, Interim Joint, and Statutory committees
 * - Agendas embedded in page when available
 * - Time/location in "9:00 am, Annex Room 154" format
 * - Committee links to detail pages
 */
export class KentuckyScraper extends BaseScraper {
  private readonly calendarUrl = 'https://apps.legislature.ky.gov/legislativecalendar';

  constructor() {
    const config: ScraperConfig = {
      stateCode: 'KY',
      stateName: 'Kentucky',
      websiteUrl: 'https://apps.legislature.ky.gov/legislativecalendar',
      reliability: 'high',
      updateFrequency: 6,
      maxRequestsPerMinute: 30,
      requestDelay: 300
    };
    super(config);
    this.log('🐴 KY Scraper initialized');
  }

  getCalendarSources(): { name: string; url: string; description: string }[] {
    return [
      {
        name: 'Kentucky Legislative Calendar',
        url: 'https://apps.legislature.ky.gov/legislativecalendar',
        description: 'House, Senate, and committee meeting schedules'
      },
      {
        name: 'Local City Meetings (Legistar API)',
        url: 'https://webapi.legistar.com',
        description: 'Lexington and Louisville city council meetings'
      }
    ];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    console.log('[SCRAPER:KY] Fetching Kentucky committee meetings...');
    
    const response = await fetch(this.calendarUrl);
    const html = await response.text();
    console.log(`[SCRAPER:KY] Fetched ${html.length} bytes from calendar`);
    
    const $ = cheerio.load(html);
    const events: KentuckyEvent[] = [];
    let currentDate = '';

    // Process the content sequentially, tracking current date as we go
    const bodyContent = $('.main .container.body-content').html() || '';
    const $body = cheerio.load(bodyContent);

    $body('*').each((_, el) => {
      const $el = $body(el);
      const text = $el.text().trim();

      // Check if this is a date header
      if (text.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+\w+\s+\d+,\s+\d{4}$/)) {
        currentDate = text;
        console.log(`[SCRAPER:KY] Found date: ${currentDate}`);
        return;
      }

      // Check for TimeAndLocation div
      if ($el.hasClass('TimeAndLocation') && currentDate) {
        const timeLocation = text;
        const timeMatch = timeLocation.match(/^(\d{1,2}:\d{2}\s+[ap]m),\s+(.+)/);
        
        if (timeMatch) {
          const time = timeMatch[1];
          const location = timeMatch[2];

          // Find the next CommitteeName div
          let nextEl = $el.next();
          while (nextEl.length > 0) {
            if (nextEl.hasClass('CommitteeName')) {
              const link = nextEl.find('a').first();
              const committee = link.text().trim();
              const committeeUrl = link.attr('href') || '';

              // Look for an Agenda div after the CommitteeName
              let agendaText = '';
              let searchEl = nextEl.next();
              while (searchEl.length > 0) {
                if (searchEl.hasClass('Agenda')) {
                  // Extract agenda content, removing the "Agenda:" heading
                  const agendaContent = searchEl.find('.AgendaHeading').remove().end().text().trim();
                  agendaText = agendaContent;
                  break;
                }
                // Stop if we hit another TimeAndLocation (next meeting)
                if (searchEl.hasClass('TimeAndLocation')) break;
                searchEl = searchEl.next();
              }

              events.push({
                date: currentDate,
                time,
                location,
                committee,
                committeeUrl: committeeUrl.startsWith('http') ? committeeUrl : `https://legislature.ky.gov${committeeUrl}`,
                agenda: agendaText || undefined
              });

              console.log(`[SCRAPER:KY] Found meeting: ${committee} on ${time}`);
              break;
            }
            nextEl = nextEl.next();
          }
        }
      }
    });

    console.log(`[SCRAPER:KY] Found ${events.length} Kentucky meetings`);

    // Filter out past events before converting
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const upcomingEvents = events.filter(event => {
      const eventDate = new Date(event.date);
      if (eventDate >= today) {
        return true;
      } else {
        console.log(`[SCRAPER:KY] Skipping past event: ${event.committee} on ${event.date}`);
        return false;
      }
    });

    console.log(`[SCRAPER:KY] Returning ${upcomingEvents.length} upcoming meetings`);
    return upcomingEvents.map(event => this.convertEventToRaw(event));
  }

  private convertEventToRaw(event: KentuckyEvent): RawEvent {
    const { date, time } = this.parseDateTime(event.date, event.time);
    
    // Format agenda description
    let description = '';
    if (event.agenda) {
      // Split agenda by newlines and take first few items
      const agendaLines = event.agenda
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .filter(line => !line.match(/^(•|\d+\.)\s*$/)); // Remove bullet/number-only lines
      
      if (agendaLines.length > 0) {
        const items = agendaLines.slice(0, 3).map(line => {
          // Remove leading bullets/numbers
          return line.replace(/^(•|\d+\.)\s*/, '').substring(0, 150);
        });
        description = `Agenda: ${items.join('; ')}${agendaLines.length > 3 ? '...' : ''}`;
      }
    }

    // Generate a short unique ID from committee name and date
    const idBase = `${event.committee}-${date}`;
    const id = `ky-${Buffer.from(idBase).toString('base64').substring(0, 12)}`;

    return {
      id,
      name: `${event.committee} Committee Meeting`,
      date,
      time,
      location: event.location,
      committee: event.committee,
      type: 'Committee Meeting',
      level: 'state',
      state: 'KY',
      city: 'Frankfort',
      lat: 38.2009,
      lng: -84.8733,
      zipCode: '40601',
      sourceUrl: event.committeeUrl,
      description,
      bills: []
    };
  }

  private parseDateTime(dateStr: string, timeStr: string): { date: string; time: string } {
    // dateStr format: "Tuesday, December 16, 2025"
    // timeStr format: "9:00 am" or "3:00 pm"
    
    try {
      // Extract date parts
      const dateMatch = dateStr.match(/(\w+),\s+(\w+)\s+(\d+),\s+(\d{4})/);
      if (!dateMatch) {
        throw new Error(`Invalid date format: ${dateStr}`);
      }

      const [, , month, day, year] = dateMatch;
      
      // Parse time
      const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s+([ap]m)/);
      if (!timeMatch) {
        throw new Error(`Invalid time format: ${timeStr}`);
      }

      const [, hourStr, minuteStr, period] = timeMatch;
      let hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);

      // Convert to 24-hour format
      if (period === 'pm' && hour !== 12) {
        hour += 12;
      } else if (period === 'am' && hour === 12) {
        hour = 0;
      }

      // Convert month name to number
      const monthMap: { [key: string]: number } = {
        January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
        July: 6, August: 7, September: 8, October: 9, November: 10, December: 11
      };

      const monthNum = monthMap[month];
      if (monthNum === undefined) {
        throw new Error(`Invalid month: ${month}`);
      }

      const dateObj = new Date(parseInt(year), monthNum, parseInt(day), hour, minute);
      
      return {
        date: dateObj.toISOString().split('T')[0],
        time: timeStr
      };
    } catch (error) {
      console.error('[SCRAPER:KY] Error parsing date/time:', error);
      return {
        date: new Date().toISOString().split('T')[0],
        time: timeStr
      };
    }
  }
}

export async function scrapeKentuckyEvents(): Promise<RawEvent[]> {
  const scraper = new KentuckyScraper();
  return scraper.scrapeCalendar();
}
