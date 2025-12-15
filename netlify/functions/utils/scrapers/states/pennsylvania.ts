import { BaseScraper, ScraperConfig, RawEvent } from '../base-scraper';
import { parseHTML } from '../html-parser';

interface PAMeeting {
  committee: string;
  date: string;
  time: string;
  location: string;
  description: string;
  chamber: 'House' | 'Senate';
  html?: string;
}

export class PennsylvaniaScraper extends BaseScraper {
  constructor() {
    const config: ScraperConfig = {
      stateCode: 'PA',
      stateName: 'Pennsylvania',
      websiteUrl: 'https://www.palegis.us',
      reliability: 'high',
      updateFrequency: 6,
      maxRequestsPerMinute: 60,
      requestDelay: 200
    };

    super(config);
    this.log('🏛️ PA Scraper initialized');
  }

  protected async getPageUrls(): Promise<string[]> {
    return [
      'https://www.palegis.us/house/committees/meeting-schedule',
      'https://www.palegis.us/senate/committees/meeting-schedule'
    ];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    try {
      this.log('📅 Scraping PA House and Senate committee schedules');
      
      const [houseEvents, senateEvents] = await Promise.all([
        this.scrapeCommitteeSchedule('house', 'House'),
        this.scrapeCommitteeSchedule('senate', 'Senate')
      ]);
      
      const allEvents = [...houseEvents, ...senateEvents];
      this.log(`✅ Scraped ${allEvents.length} PA events (${houseEvents.length} House + ${senateEvents.length} Senate)`);
      
      return allEvents;
      
    } catch (error) {
      this.log(`❌ PA scraper error: ${error}`);
      return [];
    }
  }

  private async scrapeCommitteeSchedule(chamber: 'house' | 'senate', chamberName: string): Promise<RawEvent[]> {
    try {
      const url = `https://www.palegis.us/${chamber}/committees/meeting-schedule`;
      this.log(`📅 Fetching ${chamberName} schedule`, { url });
      
      const html = await this.fetchPage(url);
      const $ = parseHTML(html, `PA ${chamberName}`);
      
      const meetings: PAMeeting[] = [];
      const meetingBlocks = $('div').filter((_, el) => {
        const text = $(el).text();
        return text.includes('AM') || text.includes('PM');
      });
      
      // Parse meeting blocks grouped by date
      // Each date has a wrapper div with data-date attribute containing all meetings for that date
      $('div.meetings[data-date]').each((_, dateDiv) => {
        const $dateDiv = $(dateDiv);
        
        // Extract the date text from the h4 inside this date group
        const dateText = $dateDiv.find('.h4').text().trim();
        // Format: "Monday, December 15, 2025"
        const dateMatch = dateText.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+\w+\s+\d{1,2},\s+\d{4}/);
        if (!dateMatch) return;
        
        const currentDate = dateMatch[0];
        
        // Find all meeting divs within this date group
        $dateDiv.find('.meeting').each((_, meetingEl) => {
          const $meeting = $(meetingEl);
          
          // Extract committee name from the link
          const committee = $meeting.find('a.committee').text().trim();
          if (!committee) return;
          
          // Extract time
          const timeText = $meeting.text();
          const timeMatch = timeText.match(/(\d{1,2}:\d{2}\s+(?:AM|PM))|Call of Chair/);
          const time = timeMatch ? timeMatch[0] : 'TBD';
          
          // Extract location
          const locationMatch = timeText.match(/Room\s+[^,\n]+|[^,\n]*Capitol[^,\n]*/);
          const location = locationMatch ? locationMatch[0].trim() : 'PA State Capitol';
          
          // Get full text and HTML for bill extraction
          const description = $meeting.text().trim();
          const html = $meeting.html() || '';
          
          meetings.push({
            committee,
            date: currentDate,
            time,
            location,
            description,
            html,
            chamber: chamberName as 'House' | 'Senate'
          });
        });
      });
      
      this.log(`✅ Parsed ${meetings.length} ${chamberName} meetings`);
      
      // Await all event conversions (now async)
      return await Promise.all(meetings.map(meeting => this.convertPAMeetingToRaw(meeting)));
      
    } catch (error) {
      this.log(`❌ Error scraping PA ${chamberName}: ${error}`);
      return [];
    }
  }

  private async convertPAMeetingToRaw(meeting: PAMeeting): Promise<RawEvent> {
    const dateStr = this.parseDate(meeting.date);
    const timeStr = this.parseTime(meeting.time);
    
    // Combine date and time into a proper Date object
    const dateTime = new Date(`${dateStr}T${timeStr}:00`);
    
    // Extract bills from HTML (which includes links) or description
    const bills = await this.extractBillsWithSummaries(meeting.html || meeting.description);
    
    // Build a detailsUrl that anchors to the committee section (best effort)
    const anchor = meeting.committee
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const detailsUrl = `https://www.palegis.us/${meeting.chamber.toLowerCase()}/committees/meeting-schedule#${anchor}`;

    const event: RawEvent = {
      name: meeting.committee,
      date: dateTime,
      time: timeStr,
      location: meeting.location,
      committee: `PA ${meeting.chamber} - ${meeting.committee}`,
      type: 'meeting',
      description: meeting.description,
      detailsUrl
    };
    
    // Add bills array if any found
    if (bills.length > 0) {
      event.bills = bills;
    }
    
    return event;
  }

  private async extractBillsWithSummaries(htmlOrText: string): Promise<Array<{ id: string; title: string; url: string; summary?: string; status?: string; sponsors?: string[]; tags?: string[] }>> {
    const billsMap = new Map<string, { id: string; title: string; url: string; summary?: string; status?: string; sponsors?: string[]; tags?: string[] }>();
    const year = new Date().getFullYear();
    
    // First, try to extract bills from HTML links (most accurate)
    // PA uses: href='https://www.palegis.us/legislation/bills/2025/hb469'>469</a>
    const linkPattern = /href=['"](https?:\/\/[^'"]*\/legislation\/bills\/(\d{4})\/([hs][br])(\d+))['"][^>]*>(\d+)<\/a>/gi;
    let linkMatch;
    while ((linkMatch = linkPattern.exec(htmlOrText)) !== null) {
      const url = linkMatch[1];
      const prefix = linkMatch[3].toUpperCase();
      const number = linkMatch[4];
      const billId = `${prefix} ${number}`;
      const title = billId;
      
      if (!billsMap.has(billId)) {
        billsMap.set(billId, {
          id: billId,
          title: title,
          url,
          status: 'Scheduled for Committee',
          sponsors: [],
          tags: []
        });
      }
    }
    
    // Fallback: extract from plain text if no HTML links found
    if (billsMap.size === 0) {
      const billPattern = /\b([HS]B)\s+(\d+)\b/gi;
      const matches = htmlOrText.matchAll(billPattern);
      
      for (const match of matches) {
        const prefix = match[1].toUpperCase();
        const number = match[2];
        const billId = `${prefix} ${number}`;
        const url = `https://www.palegis.us/legislation/bills/${year}/${prefix.toLowerCase()}${number}`;
        if (!billsMap.has(billId)) {
          billsMap.set(billId, {
            id: billId,
            title: billId,
            url,
            status: 'Scheduled for Committee',
            sponsors: [],
            tags: []
          });
        }
      }
    }
    
    // TODO: Bill summary fetching disabled to prevent rate limiting and timeouts
    // This should be implemented as a background job that:
    // 1. Runs once per day (respecting the 24-hour cache)
    // 2. Fetches summaries in small batches with delays
    // 3. Updates the cached event data with summaries
    
    return Array.from(billsMap.values());
  }

  // TODO: Add bill summary extraction for PA bills
  // This would require fetching the bill page and scraping the summary section.
  private parseDate(dateStr: string): string {
    try {
      // Handle "Monday, December 15, 2025" format
      const cleaned = dateStr.replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+/, '');
      
      if (cleaned.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
        const [month, day, year] = cleaned.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      const dateObj = new Date(cleaned);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toISOString().split('T')[0];
      }
      
      return new Date().toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  }

  private parseTime(timeStr: string): string {
    const cleaned = timeStr.trim().toLowerCase();
    if (!cleaned || cleaned.includes('tbd') || cleaned.includes('call of chair')) {
      return '10:00';
    }
    
    const match = cleaned.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = match[2];
      const meridiem = match[3];
      
      if (meridiem === 'pm' && hours < 12) hours += 12;
      if (meridiem === 'am' && hours === 12) hours = 0;
      
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }
    return '10:00';
  }
}
