import { BaseScraper } from '../base-scraper';
import type { RawEvent, BillInfo, ScraperConfig } from '../base-scraper';
import * as cheerio from 'cheerio';

/**
 * Minnesota Legislature Scraper
 * Source: https://www.leg.mn.gov/cal.aspx
 * 
 * Minnesota uses a two-stage approach:
 * 1. Main calendar page lists all meetings in a table with anchor links
 * 2. Dynamic API endpoint (cal_details) provides full meeting details
 * 
 * Data sources:
 * - Calendar listing: https://www.leg.mn.gov/cal.aspx?type=all
 * - Meeting details API: https://www.leg.mn.gov/cal_details?id={id}&type={type}
 * 
 * Notes:
 * - House meetings: id prefix 'h_', type 'h'
 * - Senate meetings: id prefix 's_', type 's'
 * - Joint/Commission: id prefix 'c_', type 'c'
 * - Canceled meetings have "text-danger" span with "Canceled"
 */
export class MinnesotaScraper extends BaseScraper {
  private readonly calendarUrl = 'https://www.leg.mn.gov/cal.aspx?type=all';
  private readonly detailsApiBase = 'https://www.leg.mn.gov/cal_details';
  private readonly stCapitolCoords = { lat: 44.9537, lng: -93.1022 }; // St. Paul

  constructor() {
    const config: ScraperConfig = {
      stateCode: 'MN',
      stateName: 'Minnesota',
      websiteUrl: 'https://www.leg.mn.gov/cal.aspx',
      reliability: 'high',
      updateFrequency: 6,
      maxRequestsPerMinute: 30,
      requestDelay: 300
    };
    super(config);
    this.log('🏛️ MN Scraper initialized');
  }

  protected async getPageUrls(): Promise<string[]> {
    return [this.calendarUrl];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    try {
      this.log('Fetching Minnesota calendar...');
      
      // Fetch main calendar page
      const response = await fetch(this.calendarUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      
      // Parse calendar to get event listings
      const eventRefs = this.parseCalendar(html);
      this.log(`Found ${eventRefs.length} event references`);

      // Fetch details for each event
      const events: RawEvent[] = [];
      for (let i = 0; i < eventRefs.length; i++) {
        const ref = eventRefs[i];
        
        // Skip canceled events
        if (ref.canceled) {
          this.log(`Skipping canceled event: ${ref.committee}`);
          continue;
        }

        try {
          const event = await this.fetchEventDetails(ref);
          if (event) {
            events.push(event);
          }
          
          // Rate limiting
          if (i < eventRefs.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (error) {
          this.log(`Error fetching details for ${ref.id}: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
      }

      this.log(`✓ Successfully scraped ${events.length} events`);
      return events;
    } catch (error) {
      const message = `Failed to scrape Minnesota: ${error instanceof Error ? error.message : 'Unknown'}`;
      this.log(message);
      throw new Error(message);
    }
  }

  private parseCalendar(html: string): EventReference[] {
    const $ = cheerio.load(html);
    const refs: EventReference[] = [];

    // Find all event links in the calendar table
    // Format: <a class='text-house/text-senate/text-joint' href='#h_39260'>Committee Name</a>
    // Exclude date anchor links (class='cal_anchor_link')
    $('.cal_data_table a[href^="#"]').each((_, elem) => {
      const $link = $(elem);
      const href = $link.attr('href');
      const committee = $link.text().trim();
      
      // Skip date anchor links
      if ($link.hasClass('cal_anchor_link')) return;
      
      if (!href || !committee) return;
      
      // Skip floor sessions
      if (committee.toLowerCase().includes('floor session')) return;
      
      // Extract ID from href (e.g., "#h_39260" -> "h_39260")
      const id = href.substring(1);
      
      // Determine type from ID prefix
      let type: 'h' | 's' | 'c' = 'c';
      let chamber = 'Joint';
      if (id.startsWith('h_')) {
        type = 'h';
        chamber = 'House';
      } else if (id.startsWith('s_')) {
        type = 's';
        chamber = 'Senate';
      }
      
      // Check if canceled (text-danger span next to link)
      const parent = $link.parent();
      const canceled = parent.find('.text-danger').text().toLowerCase().includes('cancel');
      
      refs.push({ id, type, chamber, committee, canceled });
    });

    return refs;
  }

  private async fetchEventDetails(ref: EventReference): Promise<RawEvent | null> {
    try {
      // API endpoint: cal_details?id=h_39260&type=h&d1=&d2=&format=html
      const url = `${this.detailsApiBase}?id=${ref.id}&type=${ref.type}&d1=&d2=&format=html`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        this.log(`HTTP ${response.status} for ${ref.id}`);
        return null;
      }

      const html = await response.text();
      return this.parseEventDetails(html, ref);
    } catch (error) {
      this.log(`Error fetching ${ref.id}: ${error instanceof Error ? error.message : 'Unknown'}`);
      return null;
    }
  }

  private parseEventDetails(html: string, ref: EventReference): RawEvent | null {
    try {
      const $ = cheerio.load(html);

      // Extract date and time from header: "Wednesday, December 17, 2025 10:00 AM"
      const dateTimeText = $('.card-header b').first().text().trim();
      const dateTime = this.parseDateTime(dateTimeText);
      
      if (!dateTime) {
        this.log(`Could not parse date/time: ${dateTimeText}`);
        return null;
      }

      // Extract location: <b>Location: </b>G-23
      let location = 'State Capitol';
      const locationMatch = html.match(/<b>Location:\s*<\/b>([^<]+)/i);
      if (locationMatch) {
        location = locationMatch[1].trim();
      }

      // Extract chair: <b>Chair: </b>Rep. Kristin Robbins
      let chair: string | undefined;
      const chairMatch = html.match(/<b>Chair:\s*<\/b>([^<]+)/i);
      if (chairMatch) {
        chair = chairMatch[1].trim();
      }

      // Extract agenda text
      const agendaMatch = html.match(/<h4[^>]*>Agenda:<\/h4>(.*?)(?:<hr|<div class='cal_house_docs'|$)/is);
      let description = `${ref.chamber} committee meeting`;
      if (agendaMatch) {
        const agendaHtml = agendaMatch[1];
        const agenda$ = cheerio.load(agendaHtml);
        description = agenda$.text().trim().replace(/\s+/g, ' ').substring(0, 500);
      }
      if (chair) {
        description = `Chair: ${chair}. ${description}`;
      }

      // Extract committee link
      const committeeLink = $('h3 a').first().attr('href') || undefined;

      // Extract live video link
      let videoUrl: string | undefined;
      const videoLink = $('.cal_live_video a').attr('href');
      if (videoLink) {
        videoUrl = videoLink.startsWith('http') ? videoLink : `https://www.leg.mn.gov${videoLink}`;
      }

      // Extract bills from agenda text (format: HF 1234, SF 567)
      const bills = this.extractBills(html);

      // Generate unique ID
      const eventId = `mn-${dateTime.getTime()}-${ref.id}`;

      return {
        id: eventId,
        name: ref.committee,
        date: dateTime.toISOString(),
        time: this.formatTime(dateTime),
        location,
        committee: ref.committee,
        type: 'committee-meeting',
        level: 'state',
        state: 'MN',
        city: 'St. Paul',
        lat: this.stCapitolCoords.lat,
        lng: this.stCapitolCoords.lng,
        zipCode: null,
        description,
        sourceUrl: committeeLink,
        virtualMeetingUrl: videoUrl,
        url: `https://www.leg.mn.gov/cal?type=single&mtgid=${ref.id}`,
        bills: bills.length > 0 ? bills : undefined
      };
    } catch (error) {
      this.log(`Error parsing details for ${ref.id}: ${error instanceof Error ? error.message : 'Unknown'}`);
      return null;
    }
  }

  private parseDateTime(text: string): Date | null {
    try {
      // Format: "Wednesday, December 17, 2025 10:00 AM"
      const match = text.match(/(\w+,\s+\w+\s+\d+,\s+\d{4})\s+(\d+:\d+\s*[AP]M)/i);
      if (!match) return null;

      const dateStr = match[1]; // "Wednesday, December 17, 2025"
      const timeStr = match[2]; // "10:00 AM"

      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return null;

      // Parse time
      const timeMatch = timeStr.match(/(\d+):(\d+)\s*([AP]M)/i);
      if (!timeMatch) return date;

      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const period = timeMatch[3].toUpperCase();

      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;

      date.setHours(hours, minutes, 0, 0);
      return date;
    } catch (error) {
      this.log(`Error parsing date/time: ${text}`);
      return null;
    }
  }

  private formatTime(date: Date): string {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  private extractBills(html: string): BillInfo[] {
    const bills: BillInfo[] = [];
    const billRegex = /\b([HS]F)\s*(\d+)\b/gi;
    
    let match;
    while ((match = billRegex.exec(html)) !== null) {
      const billType = match[1].toUpperCase();
      const billNum = match[2];
      const billId = `${billType}${billNum}`;
      
      // Avoid duplicates
      if (!bills.find(b => b.id === billId)) {
        bills.push({
          id: billId,
          title: `${billType} ${billNum}`,
          url: `https://www.revisor.mn.gov/bills/bill.php?b=${billType}&f=${billNum}&ssn=0&y=2025`
        });
      }
    }
    
    return bills;
  }
}

interface EventReference {
  id: string;           // e.g., "h_39260"
  type: 'h' | 's' | 'c'; // house, senate, commission
  chamber: string;      // "House", "Senate", "Joint"
  committee: string;    // Committee name
  canceled: boolean;    // Is event canceled?
}
