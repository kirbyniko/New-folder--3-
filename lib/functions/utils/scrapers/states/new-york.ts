import { BaseScraper, ScraperConfig, RawEvent } from '../base-scraper';
import { parseHTML } from '../html-parser';

interface PublicHearing {
  date: string;
  committee: string;
  topic: string;
  location: string;
  time: string;
  contact: string;
  noticeUrl?: string;
}

export class NewYorkScraper extends BaseScraper {
  constructor() {
    const config: ScraperConfig = {
      stateCode: 'NY',
      stateName: 'New York',
      websiteUrl: 'https://nyassembly.gov/leg/?sh=hear',
      reliability: 'high',
      updateFrequency: 6,
      maxRequestsPerMinute: 20,
      requestDelay: 500
    };

    super(config);
    this.log('🏛️ NY Scraper initialized');
  }

  getCalendarSources(): { name: string; url: string; description: string }[] {
    return [
      {
        name: 'New York Assembly Public Hearings',
        url: 'https://nyassembly.gov/leg/?sh=hear',
        description: 'Assembly and Senate public hearing schedules'
      },
      {
        name: 'Local City Meetings (Legistar API)',
        url: 'https://webapi.legistar.com',
        description: 'New York City Council meetings'
      }
    ];
  }

  protected async getPageUrls(): Promise<string[]> {
    return ['https://nyassembly.gov/leg/?sh=hear'];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    const hearings = await this.fetchPublicHearings();
    
    const events: RawEvent[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (const hearing of hearings) {
      try {
        const date = this.parseNYDate(hearing.date);
        
        // Only include future hearings
        if (date < today) {
          continue;
        }
        
        // Create event ID
        const dateStr = date.toISOString().split('T')[0];
        const committeeSlug = hearing.committee
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        const id = `ny-${dateStr}-${committeeSlug}`;
        
        // Parse location for room/building info
        const locationParts = hearing.location.split(',');
        const room = locationParts[0]?.trim() || 'TBD';
        const building = locationParts[1]?.trim() || 'Legislative Office Building';
        
        const event: RawEvent = {
          id,
          name: hearing.topic,
          date: dateStr,
          time: hearing.time,
          location: `${room}, ${building}`,
          committee: hearing.committee,
          type: 'committee-meeting',
          detailsUrl: hearing.noticeUrl || 'https://nyassembly.gov/leg/?sh=hear',
          sourceUrl: 'https://nyassembly.gov/leg/?sh=hear'
        };
        
        events.push(event);
      } catch (error) {
        this.log(`Error processing NY hearing: ${error}`);
        continue;
      }
    }
    
    this.log(`✅ Returning ${events.length} NY public hearings (${hearings.length} total found)`);
    return events;
  }

  private async fetchPublicHearings(): Promise<PublicHearing[]> {
    const url = 'https://nyassembly.gov/leg/?sh=hear';
    const html = await this.fetchPage(url);
    const $ = parseHTML(html, 'NY Assembly Public Hearings');
    
    const hearings: PublicHearing[] = [];
    let currentDate = '';
    
    // The page structure has date headers followed by hearing details
    const pageText = $('body').text();
    const lines = pageText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      
      // Check if this line is a date (e.g., "Dec. 16")
      const dateMatch = line.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.\s+(\d+)$/);
      if (dateMatch) {
        currentDate = line;
        i++;
        continue;
      }
      
      // Look for committee lines
      if ((line.includes('Assembly Standing Committee') || line.includes('Senate Standing Committee') || line.includes('Joint --')) && currentDate) {
        let committee = line;
        let topic = '';
        let location = '';
        let time = '';
        let contact = '';
        let noticeUrl = '';
        
        // Find the committee name (may span multiple lines)
        let j = i + 1;
        while (j < lines.length && !lines[j].startsWith('Public Hearing')) {
          if (lines[j].includes('Chair:') || lines[j].includes('Assembly Standing Committee') || lines[j].includes('Senate Standing Committee')) {
            committee += ' ' + lines[j];
          }
          j++;
        }
        
        // Find "Public Hearing" line
        if (j < lines.length && lines[j].startsWith('Public Hearing')) {
          j++;
          // Topic is on the next line(s)
          while (j < lines.length && !lines[j].startsWith('View public hearing notice') && !lines[j].startsWith('Place')) {
            topic += (topic ? ' ' : '') + lines[j];
            j++;
          }
        }
        
        // Find notice URL
        const noticeLink = $(`a:contains("View public hearing notice")`).eq(hearings.length).attr('href');
        if (noticeLink) {
          noticeUrl = noticeLink.startsWith('http') ? noticeLink : `https://nyassembly.gov${noticeLink}`;
        }
        
        // Find location
        while (j < lines.length && !lines[j].startsWith('Place')) {
          j++;
        }
        if (j < lines.length && lines[j].startsWith('Place')) {
          j++;
          while (j < lines.length && !lines[j].startsWith('Time')) {
            location += (location ? ' ' : '') + lines[j];
            j++;
          }
        }
        
        // Find time
        if (j < lines.length && lines[j].startsWith('Time')) {
          j++;
          if (j < lines.length) {
            time = lines[j];
          }
        }
        
        // Find contact
        while (j < lines.length && !lines[j].startsWith('Contact')) {
          j++;
        }
        if (j < lines.length && lines[j].startsWith('Contact')) {
          j++;
          if (j < lines.length) {
            contact = lines[j];
          }
        }
        
        // Clean up committee name
        committee = committee
          .replace(/Chair:.*?(?=Assembly|Senate|$)/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (committee && topic && location && time) {
          hearings.push({
            date: currentDate,
            committee,
            topic: topic.trim(),
            location: location.trim(),
            time: time.trim(),
            contact: contact.trim(),
            noticeUrl: noticeUrl || undefined,
          });
        }
        
        i = j;
      } else {
        i++;
      }
    }
    
    this.log(`Fetched ${hearings.length} NY public hearings from calendar`);
    return hearings;
  }

  private parseNYDate(dateStr: string): Date {
    // Parse dates like "Dec. 16" or "Jan. 8"
    const match = dateStr.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.\s+(\d+)$/);
    if (!match) {
      throw new Error(`Invalid NY date format: ${dateStr}`);
    }
    
    const monthMap: { [key: string]: number } = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    
    const month = monthMap[match[1]];
    const day = parseInt(match[2], 10);
    
    // Determine year
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    let year = currentYear;
    // If the hearing month is earlier than current month, it's next year
    // Exception: if we're in December (11) and hearing is in December, keep current year
    if (month < currentMonth) {
      year = currentYear + 1;
    } else if (month === currentMonth) {
      // Same month - check if day has passed
      const currentDay = now.getDate();
      if (day < currentDay) {
        year = currentYear + 1;
      }
    }
    
    return new Date(year, month, day);
  }
}
