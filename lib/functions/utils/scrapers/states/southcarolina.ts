import { BaseScraper } from '../base-scraper';
import type { RawEvent, BillInfo, ScraperConfig } from '../base-scraper';
import { enrichEventMetadata } from '../shared/tagging';
import * as cheerio from 'cheerio';

/**
 * South Carolina Legislature Scraper
 * Source: https://www.scstatehouse.gov/meetings.php
 * 
 * South Carolina lists committee meetings by chamber with simple HTML structure.
 * Meetings include time, location, committee name, and live broadcast links.
 * 
 * Data sources:
 * - House meetings: https://www.scstatehouse.gov/meetings.php?chamber=H
 * - Senate meetings: https://www.scstatehouse.gov/meetings.php?chamber=S
 * 
 * Notes:
 * - Times often include conditional phrases like "1 hour after adjournment"
 * - Live broadcast links available for most meetings
 * - Weekly schedule view with "Additional Meetings" section for future dates
 */
export class SouthCarolinaScraper extends BaseScraper {
  private readonly houseUrl = 'https://www.scstatehouse.gov/meetings.php?chamber=H';
  private readonly senateUrl = 'https://www.scstatehouse.gov/meetings.php?chamber=S';
  private readonly columbiaCoords = { lat: 34.0007, lng: -81.0348 }; // State House

  constructor() {
    const config: ScraperConfig = {
      stateCode: 'SC',
      stateName: 'South Carolina',
      websiteUrl: 'https://www.scstatehouse.gov',
      reliability: 'high',
      updateFrequency: 6,
      maxRequestsPerMinute: 30,
      requestDelay: 200
    };
    super(config);
    this.log('🌴 SC Scraper initialized (OpenStates)');
  }

  getCalendarSources(): { name: string; url: string; description: string }[] {
    return [
      {
        name: 'South Carolina Legislature',
        url: 'https://www.scstatehouse.gov',
        description: 'House and Senate legislative calendars (via OpenStates)'
      },
      {
        name: 'Local City Meetings (Legistar API)',
        url: 'https://webapi.legistar.com',
        description: 'City council meetings from Columbia, Charleston, Greenville, and other South Carolina cities'
      }
    ];
  }

  protected async getPageUrls(): Promise<string[]> {
    return [this.houseUrl, this.senateUrl];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    try {
      this.log('Fetching South Carolina schedules...');
      
      // Fetch both chambers
      const [houseHtml, senateHtml] = await Promise.all([
        this.fetchChamber('H'),
        this.fetchChamber('S')
      ]);

      const events: RawEvent[] = [];
      
      // Parse House meetings
      const houseEvents = this.parseMeetings(houseHtml, 'House');
      events.push(...houseEvents);
      this.log(`Found ${houseEvents.length} House meetings`);

      // Parse Senate meetings
      const senateEvents = this.parseMeetings(senateHtml, 'Senate');
      events.push(...senateEvents);
      this.log(`Found ${senateEvents.length} Senate meetings`);

      this.log(`✓ Successfully scraped ${events.length} total events`);
      return events;
    } catch (error) {
      const message = `Failed to scrape South Carolina: ${error instanceof Error ? error.message : 'Unknown'}`;
      this.log(message);
      throw new Error(message);
    }
  }

  private async fetchChamber(chamber: 'H' | 'S'): Promise<string> {
    const url = chamber === 'H' ? this.houseUrl : this.senateUrl;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${chamber}`);
    }

    return response.text();
  }

  private parseMeetings(html: string, chamber: string): RawEvent[] {
    const $ = cheerio.load(html);
    const events: RawEvent[] = [];

    // Check for "No Meetings Scheduled" message
    const noMeetingsText = $('div:contains("No Meetings Scheduled")').text();
    if (noMeetingsText && !html.includes('Additional Meetings')) {
      this.log(`No ${chamber} meetings scheduled`);
      return [];
    }

    // Find all meeting list items
    // Structure: <ul><span>Date</span><li>meeting details</li></ul>
    $('ul').each((_, ul) => {
      const $ul = $(ul);
      
      // Get the date from the span
      const dateSpan = $ul.find('span[style*="font-weight:bold"]').first();
      const dateText = dateSpan.text().trim();
      
      // Parse date (format: "Tuesday, January 13, 2026")
      const date = this.parseDate(dateText);
      if (!date) return;

      // Find all meeting items in this list
      $ul.find('li').each((_, li) => {
        const $li = $(li);
        const meetingText = $li.text();
        
        // Extract meeting details
        const event = this.parseMeetingItem(meetingText, date, chamber, $li);
        if (event) {
          events.push(event);
        }
      });
    });

    return events;
  }

  private parseMeetingItem(text: string, date: Date, chamber: string, $li: cheerio.Cheerio): RawEvent | null {
    try {
      // Format: "1 hour after adjournment of the House -- Blatt Room 110 -- SC DOT Modernization Ad Hoc Committee"
      const parts = text.split(' -- ');
      if (parts.length < 3) return null;

      const timeText = parts[0].trim();
      const location = parts[1].trim();
      const committeeName = parts[2].split('\n')[0].trim(); // Take only committee name before revisions

      // Extract meeting ID from anchor name
      const meetingId = $li.parent().find('a[name]').attr('name') || '';

      // Parse time (handle "upon adjournment" phrases)
      const { time, description } = this.parseTime(timeText, date);

      // Check for live broadcast link
      let videoUrl: string | undefined;
      const liveLink = $li.find('a[onclick*="live_stream"]').first();
      if (liveLink.length > 0 && meetingId) {
        videoUrl = `https://www.scstatehouse.gov/video/stream.php?key=${meetingId}&audio=0`;
      }

      // Generate unique ID
      const eventId = `sc-${date.getTime()}-${this.slugify(committeeName)}`;

      return {
        id: eventId,
        name: committeeName,
        date: date.toISOString(),
        time,
        location,
        committee: committeeName,
        type: 'committee-meeting',
        level: 'state',
        state: 'SC',
        city: 'Columbia',
        lat: this.columbiaCoords.lat,
        lng: this.columbiaCoords.lng,
        zipCode: null,
        description: `${chamber} ${description}`,
        sourceUrl: chamber === 'House' ? this.houseUrl : this.senateUrl,
        virtualMeetingUrl: videoUrl,
        url: chamber === 'House' ? this.houseUrl : this.senateUrl
      };
    } catch (error) {
      this.log(`Error parsing meeting: ${error instanceof Error ? error.message : 'Unknown'}`);
      return null;
    }
  }

  private parseDate(dateText: string): Date | null {
    try {
      // Format: "Tuesday, January 13, 2026"
      // Remove day of week
      const match = dateText.match(/\w+,\s+(\w+\s+\d+,\s+\d{4})/);
      if (!match) return null;

      const cleanDate = match[1]; // "January 13, 2026"
      const date = new Date(cleanDate);
      
      if (isNaN(date.getTime())) return null;
      return date;
    } catch (error) {
      return null;
    }
  }

  private parseTime(timeText: string, date: Date): { time: string, description: string } {
    // Common patterns:
    // "1 hour after adjournment of the House"
    // "Immediately upon adjournment of the House"
    // "10:00 AM"

    // Check for standard time format
    const timeMatch = timeText.match(/(\d+:\d+\s*[AP]M)/i);
    if (timeMatch) {
      const standardTime = timeMatch[1];
      
      // Parse time to update date object
      const timeParts = standardTime.match(/(\d+):(\d+)\s*([AP]M)/i);
      if (timeParts) {
        let hours = parseInt(timeParts[1]);
        const minutes = parseInt(timeParts[2]);
        const period = timeParts[3].toUpperCase();

        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;

        date.setHours(hours, minutes, 0, 0);
      }

      return {
        time: standardTime,
        description: `committee meeting at ${standardTime}`
      };
    }

    // Handle "upon adjournment" phrases
    if (timeText.toLowerCase().includes('immediately upon adjournment')) {
      // Set to end of day as placeholder
      date.setHours(17, 0, 0, 0);
      return {
        time: 'Upon Adjournment',
        description: `committee meeting immediately upon adjournment. ${timeText}`
      };
    }

    if (timeText.toLowerCase().includes('hour after adjournment') || 
        timeText.toLowerCase().includes('hours after adjournment')) {
      // Extract number of hours
      const hoursMatch = timeText.match(/(\d+)\s+hours?/i);
      const hours = hoursMatch ? parseInt(hoursMatch[1]) : 1;
      
      // Set to estimated time (assume adjournment at 5 PM)
      date.setHours(17 + hours, 0, 0, 0);
      
      return {
        time: `${hours}h After Adjournment`,
        description: `committee meeting ${timeText.toLowerCase()}`
      };
    }

    // Default
    date.setHours(12, 0, 0, 0);
    return {
      time: 'TBD',
      description: `committee meeting. Time: ${timeText}`
    };
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 40);
  }
}
