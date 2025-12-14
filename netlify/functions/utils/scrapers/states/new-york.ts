import { BaseScraper, ScraperConfig, RawEvent } from '../base-scraper';
import { parseHTML } from '../html-parser';

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

  protected async getPageUrls(): Promise<string[]> {
    return [
      'https://nyassembly.gov/leg/?sh=hear',
      'https://www.nysenate.gov/calendar'
    ];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    try {
      const events: RawEvent[] = [];
      
      // Scrape Assembly hearings
      const assemblyUrl = 'https://nyassembly.gov/leg/?sh=hear';
      this.log('📅 Fetching NY Assembly calendar');
      
      const html = await this.fetchPage(assemblyUrl);
      const $ = parseHTML(html, 'NY Assembly');
      
      $('.hearing-item, .calendar-row, tr.hearing').each((_, row) => {
        const $row = $(row);
        const title = $row.find('.title, .committee, td:nth-child(1)').text().trim();
        const dateText = $row.find('.date, td:nth-child(2)').text().trim();
        const timeText = $row.find('.time, td:nth-child(3)').text().trim();
        const location = $row.find('.location, td:nth-child(4)').text().trim();
        
        if (title && dateText) {
          events.push({
            name: title,
            date: this.parseDate(dateText),
            time: this.parseTime(timeText),
            location: location || 'NYS Capitol Building, Albany',
            committee: `NY Assembly - ${title}`,
            type: 'meeting',
            detailsUrl: 'https://nyassembly.gov/leg/?sh=hear'
          });
        }
      });
      
      this.log(`✅ Scraped ${events.length} NY events`);
      return events;
      
    } catch (error) {
      this.log(`❌ NY scraper error: ${error}`);
      return [];
    }
  }

  private parseDate(dateStr: string): string {
    try {
      const cleaned = dateStr.trim();
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
    if (!cleaned || cleaned.includes('tbd')) return '10:00';
    
    const match = cleaned.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = match[2] || '00';
      const meridiem = match[3];
      
      if (meridiem === 'pm' && hours < 12) hours += 12;
      if (meridiem === 'am' && hours === 12) hours = 0;
      
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }
    return '10:00';
  }
}
