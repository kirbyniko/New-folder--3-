import { BaseScraper, ScraperConfig, RawEvent } from '../base-scraper';
import { parseHTML } from '../html-parser';

interface CAHearing {
  date: string;
  time: string;
  committee: string;
  location: string;
}

export class CaliforniaScraper extends BaseScraper {
  constructor() {
    const config: ScraperConfig = {
      stateCode: 'CA',
      stateName: 'California',
      websiteUrl: 'https://assembly.ca.gov/dailyfile',
      reliability: 'high',
      updateFrequency: 6,
      maxRequestsPerMinute: 20,
      requestDelay: 500
    };

    super(config);
    this.log('🏛️ CA Scraper initialized');
  }

  protected async getPageUrls(): Promise<string[]> {
    return ['https://assembly.ca.gov/dailyfile'];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    try {
      const pageUrl = 'https://assembly.ca.gov/dailyfile';
      const [assemblyEvents] = await Promise.all([
        this.scrapeAssemblyCalendar(pageUrl)
      ]);

      return [...assemblyEvents];
    } catch (error) {
      this.log(`Error scraping calendar: ${error}`);
      return [];
    }
  }

  private async scrapeAssemblyCalendar(pageUrl: string): Promise<RawEvent[]> {
    try {
      const html = await this.fetchPage(pageUrl);
      const $ = parseHTML(html);
      
      const hearings: CAHearing[] = [];
      
      // Parse the committee hearing table
      $('.committee-hearing-table tbody tr.committee-hearing-details').each((_: number, row: any) => {
        const $row = $(row);
        
        const date = $row.find('.committee_hearing-date').text().trim();
        const time = $row.find('.committee_hearing-time').text().trim();
        const committee = $row.find('.committee_hearing-name').text().trim();
        const location = $row.find('.committee_hearing-location').text().trim()
          .replace(/<br\s*\/?>/gi, ', ') // Replace <br> with commas
          .replace(/\s+/g, ' '); // Normalize whitespace
        
        if (date && time && committee && location) {
          hearings.push({ date, time, committee, location });
        }
      });

      this.log(`✅ California Assembly: Found ${hearings.length} hearings`);
      
      return hearings.map(hearing => this.convertCAHearingToRaw(hearing, 'Assembly'));
    } catch (error) {
      this.log(`Error scraping California Assembly: ${error}`);
      return [];
    }
  }

  private convertCAHearingToRaw(hearing: CAHearing, chamber: string): RawEvent {
    // Parse date format: "12/11/25" or "01/12/26"
    const dateParts = hearing.date.split('/');
    const month = parseInt(dateParts[0]);
    const day = parseInt(dateParts[1]);
    let year = parseInt(dateParts[2]);
    
    // Convert 2-digit year to 4-digit
    if (year < 100) {
      year += 2000;
    }
    
    // Create date string
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Parse time format: "9am", "2:30pm", "10am"
    let timeStr = '09:00'; // default
    const timeLower = hearing.time.toLowerCase().trim();
    
    const timeMatch = timeLower.match(/(\d+):?(\d+)?\s*(am|pm)/);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const meridiem = timeMatch[3];
      
      if (meridiem === 'pm' && hour !== 12) hour += 12;
      if (meridiem === 'am' && hour === 12) hour = 0;
      
      timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }
    
    const locationDisplay = hearing.location;

    return {
      name: hearing.committee,
      date: dateStr,
      time: timeStr,
      location: locationDisplay,
      committee: `CA ${chamber} - ${hearing.committee}`,
      description: `California ${chamber} Committee Hearing`,
      detailsUrl: 'https://assembly.ca.gov/dailyfile'
    };
  }

}