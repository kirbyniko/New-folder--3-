import * as cheerio from 'cheerio';
import { BaseScraper } from '../base-scraper';
import { RawEvent } from '../../types';

export class NebraskaScraper extends BaseScraper {
  private readonly baseUrl = 'https://nebraskalegislature.gov';
  private readonly calendarUrl = `${this.baseUrl}/calendar/calendar.php`;

  constructor() {
    super({
      stateCode: 'NE',
      stateName: 'Nebraska',
      capitolCity: 'Lincoln',
      capitolCoordinates: { lat: 40.8136, lng: -96.7026 }
    });
  }

  getCalendarSources() {
    return [
      {
        name: 'Nebraska Legislature Calendar',
        url: this.calendarUrl,
        type: 'primary' as const,
        lastChecked: new Date().toISOString(),
        status: 'active' as const,
        notes: 'Official Unicameral Legislature calendar with committee hearings'
      }
    ];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    try {
      // Nebraska posts hearings as they're scheduled
      // Check a range of dates: past month (interim) + next 3 months (session)
      const dates: string[] = [];
      const now = new Date();
      
      // Go back 30 days for interim hearings
      for (let i = -30; i <= 90; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() + i);
        dates.push(date.toISOString().split('T')[0]);
      }

      console.log(`📅 Checking ${dates.length} dates for hearings...`);

      // Fetch hearings for each date
      const allEvents: RawEvent[] = [];
      let checkedCount = 0;
      let foundCount = 0;
      
      for (const date of dates) {
        const events = await this.scrapeHearingsForDate(date);
        if (events.length > 0) {
          allEvents.push(...events);
          foundCount++;
        }
        checkedCount++;
        
        // Log progress every 30 days
        if (checkedCount % 30 === 0) {
          console.log(`  Checked ${checkedCount}/${dates.length} dates, found ${foundCount} with hearings...`);
        }
      }

      console.log(`✅ Total Nebraska events found: ${allEvents.length}`);
      return allEvents;
    } catch (error) {
      console.error('Error scraping Nebraska calendar:', error);
      return [];
    }
  }

  private async scrapeHearingsForDate(date: string): Promise<RawEvent[]> {
    try {
      const url = `${this.baseUrl}/calendar/hearings.php?day=${date}`;
      const response = await fetch(url);
      const html = await response.text();
      
      // Quick check if there are no hearings
      if (html.includes('There are no hearings')) {
        return [];
      }
      
      const $ = cheerio.load(html);

      const events: RawEvent[] = [];

      // Each hearing is in a card with card-header containing committee name and small tag with location/time
      $('.card').each((_, card) => {
        const $card = $(card);
        const header = $card.find('.card-header');
        
        // Extract committee name from the first column
        const committee = header.find('.col-6').first().text().trim();
        if (!committee) return;

        // Extract location and time from small tag
        const smallText = header.find('small').text();
        const locationMatch = smallText.match(/Location:\s*(.+?)(?:<br|Time:)/);
        const timeMatch = smallText.match(/Time:\s*(.+)/);
        
        const location = locationMatch ? locationMatch[1].trim() : 'TBD';
        const time = timeMatch ? timeMatch[1].trim() : 'TBD';

        // Extract bills/documents from the table
        const bills: Array<{ number: string; title: string; sponsor: string }> = [];
        let description = '';

        $card.find('table tr').each((idx, row) => {
          if (idx === 0) return; // Skip header row
          
          const $row = $(row);
          const docNum = $row.find('.col-md-2').first().text().trim();
          const sponsor = $row.find('.col-md-2').eq(1).text().trim().replace('Introducer:', '').trim();
          const desc = $row.find('.col-md-8').text().trim().replace('Description:', '').trim();

          // Check if it's a bill (LB/LR followed by number) or special meeting
          if (docNum && docNum.match(/^(LB|LR)\d+/)) {
            bills.push({
              number: docNum,
              title: desc.split('\n')[0].substring(0, 200), // First line, truncate
              sponsor: sponsor
            });
          } else if (desc) {
            // Special meeting or hearing without bill number
            description = desc.substring(0, 300);
          }
        });

        // Create event name
        const eventName = bills.length > 0
          ? `${committee} - ${bills.length} Bill${bills.length > 1 ? 's' : ''}`
          : committee;

        // Parse the date
        const eventDate = new Date(date);
        
        // Parse time to add to date
        if (time !== 'TBD') {
          const timeStr = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
          if (timeStr) {
            let hours = parseInt(timeStr[1]);
            const minutes = parseInt(timeStr[2]);
            const meridian = timeStr[3].toUpperCase();
            
            if (meridian === 'PM' && hours !== 12) hours += 12;
            if (meridian === 'AM' && hours === 12) hours = 0;
            
            eventDate.setHours(hours, minutes, 0, 0);
          }
        }

        events.push({
          id: `ne-${eventDate.getTime()}-${this.sanitizeForId(committee)}`,
          name: eventName,
          date: eventDate.toISOString(),
          time: time,
          location: location,
          committee: committee,
          type: 'committee-meeting',
          level: 'state',
          state: 'NE',
          city: 'Lincoln',
          lat: 40.8136,
          lng: -96.7026,
          zipCode: null,
          description: description || (bills.length > 0 ? `Hearing on ${bills.length} bill${bills.length > 1 ? 's' : ''}` : ''),
          sourceUrl: url,
          docketUrl: undefined,
          virtualMeetingUrl: undefined,
          bills: bills.map(b => ({
            number: b.number,
            title: b.title,
            sponsor: b.sponsor,
            status: 'In Committee'
          }))
        });
      });

      console.log(`  📋 ${date}: ${events.length} hearing${events.length !== 1 ? 's' : ''}`);
      return events;
    } catch (error) {
      console.error(`Error scraping hearings for ${date}:`, error);
      return [];
    }
  }

  private sanitizeForId(text: string): string {
    return text.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 30);
  }
}
