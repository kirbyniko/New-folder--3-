import { BaseScraper, ScraperConfig, RawEvent } from '../base-scraper';
import { parseHTML } from '../html-parser';

interface TXHearing {
  committee: string;
  date: string;
  time: string;
  location: string;
  chamber: string;
}

export class TexasScraper extends BaseScraper {
  constructor() {
    const config: ScraperConfig = {
      stateCode: 'TX',
      stateName: 'Texas',
      websiteUrl: 'https://capitol.texas.gov/Calendar/Meetings',
      reliability: 'high',
      updateFrequency: 6,
      maxRequestsPerMinute: 20,
      requestDelay: 500
    };

    super(config);
    this.log('🏛️ TX Scraper initialized');
  }

  protected async getPageUrls(): Promise<string[]> {
    // Texas Legislature meeting calendar
    return ['https://capitol.texas.gov/Calendar/Meetings'];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    try {
      const pageUrl = 'https://capitol.texas.gov/Calendar/Meetings';
      this.log('📅 Fetching TX calendar', { url: pageUrl });
      
      const html = await this.fetchPage(pageUrl);
      const $ = parseHTML(html, 'TX Calendar');
      
      const hearings: TXHearing[] = [];
      
      // Parse meeting table - Texas uses a structured table format
      $('.meeting-row, .calendar-row, tr[data-meeting]').each((_, row) => {
        const $row = $(row);
        
        // Extract committee name
        const committee = $row.find('.committee, td:nth-child(1)').text().trim();
        
        // Extract date and time
        const dateText = $row.find('.date, td:nth-child(2)').text().trim();
        const timeText = $row.find('.time, td:nth-child(3)').text().trim();
        
        // Extract location
        const location = $row.find('.location, td:nth-child(4)').text().trim();
        
        // Determine chamber from committee name
        const chamber = committee.toLowerCase().includes('senate') ? 'Senate' : 
                       committee.toLowerCase().includes('house') ? 'House' : 'Joint';
        
        if (committee && dateText) {
          hearings.push({
            committee,
            date: dateText,
            time: timeText || 'TBD',
            location: location || 'Texas State Capitol',
            chamber
          });
        }
      });
      
      this.log(`✅ Parsed ${hearings.length} TX meetings`);
      
      // Convert to RawEvent format
      const events = hearings.map(hearing => this.convertTXHearingToRaw(hearing));
      
      return events;
      
    } catch (error) {
      this.log(`❌ Error scraping TX calendar: ${error}`);
      return [];
    }
  }

  private convertTXHearingToRaw(hearing: TXHearing): RawEvent {
    // Parse Texas date format (e.g., "12/17/2025" or "December 17, 2025")
    const date = this.parseTexasDate(hearing.date);
    
    // Parse time (e.g., "2:00 PM" or "Upon Adjournment")
    const time = this.parseTexasTime(hearing.time);
    
    return {
      name: hearing.committee,
      date: date,
      time: time,
      location: hearing.location,
      committee: `TX ${hearing.chamber} - ${hearing.committee}`,
      type: 'meeting',
      description: `${hearing.committee} meeting at ${hearing.location}`,
      detailsUrl: 'https://capitol.texas.gov/Calendar/Meetings'
    };
  }

  private parseTexasDate(dateStr: string): string {
    try {
      // Handle formats like "12/17/2025" or "December 17, 2025"
      const cleaned = dateStr.trim();
      
      // Try parsing as MM/DD/YYYY
      if (cleaned.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
        const [month, day, year] = cleaned.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      // Try parsing as "Month Day, Year"
      const dateObj = new Date(cleaned);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toISOString().split('T')[0];
      }
      
      // Fallback to today
      return new Date().toISOString().split('T')[0];
    } catch (error) {
      this.log(`⚠️ Could not parse date: ${dateStr}`);
      return new Date().toISOString().split('T')[0];
    }
  }

  private parseTexasTime(timeStr: string): string {
    try {
      const cleaned = timeStr.trim().toLowerCase();
      
      // Handle special cases
      if (cleaned.includes('adjournment') || cleaned.includes('tbd') || !cleaned) {
        return '09:00'; // Default morning time
      }
      
      // Parse "2:00 PM" format
      const match = cleaned.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
      if (match) {
        let hours = parseInt(match[1]);
        const minutes = match[2] || '00';
        const meridiem = match[3];
        
        if (meridiem === 'pm' && hours < 12) hours += 12;
        if (meridiem === 'am' && hours === 12) hours = 0;
        
        return `${hours.toString().padStart(2, '0')}:${minutes}`;
      }
      
      return '09:00'; // Default
    } catch (error) {
      this.log(`⚠️ Could not parse time: ${timeStr}`);
      return '09:00';
    }
  }
}
