import { BaseScraper, ScraperConfig, RawEvent } from '../base-scraper';
import { parseHTML } from '../html-parser';

export class FloridaScraper extends BaseScraper {
  constructor() {
    const config: ScraperConfig = {
      stateCode: 'FL',
      stateName: 'Florida',
      websiteUrl: 'https://www.myfloridahouse.gov/Sections/Calendar/calendar.aspx',
      reliability: 'high',
      updateFrequency: 6,
      maxRequestsPerMinute: 20,
      requestDelay: 500
    };

    super(config);
    this.log('🏛️ FL Scraper initialized');
  }

  protected async getPageUrls(): Promise<string[]> {
    return [
      'https://www.myfloridahouse.gov/Sections/Calendar/calendar.aspx',
      'https://www.flsenate.gov/Session/Calendar'
    ];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    try {
      const events: RawEvent[] = [];
      
      // Scrape House calendar
      const houseUrl = 'https://www.myfloridahouse.gov/Sections/Calendar/calendar.aspx';
      this.log('📅 Fetching FL House calendar');
      
      const houseHtml = await this.fetchPage(houseUrl);
      const $house = parseHTML(houseHtml, 'FL House');
      
      $house('.calendar-item, .meeting-item, tr.meeting').each((_, row) => {
        const $row = $house(row);
        const committee = $row.find('.committee, td:nth-child(1)').text().trim();
        const dateText = $row.find('.date, td:nth-child(2)').text().trim();
        const timeText = $row.find('.time, td:nth-child(3)').text().trim();
        const location = $row.find('.location, td:nth-child(4)').text().trim();
        
        if (committee && dateText) {
          events.push({
            name: committee,
            date: this.parseDate(dateText),
            time: this.parseTime(timeText),
            location: location || 'Florida House of Representatives',
            committee: `FL House - ${committee}`,
            type: 'meeting',
            detailsUrl: 'https://www.myfloridahouse.gov/Sections/Calendar/calendar.aspx'
          });
        }
      });
      
      this.log(`✅ Scraped ${events.length} FL events`);
      return events;
      
    } catch (error) {
      this.log(`❌ FL scraper error: ${error}`);
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
    if (!cleaned || cleaned.includes('tbd')) return '09:00';
    
    const match = cleaned.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = match[2] || '00';
      const meridiem = match[3];
      
      if (meridiem === 'pm' && hours < 12) hours += 12;
      if (meridiem === 'am' && hours === 12) hours = 0;
      
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }
    return '09:00';
  }
}
