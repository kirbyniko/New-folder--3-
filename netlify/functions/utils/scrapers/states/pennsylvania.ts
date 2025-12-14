import { BaseScraper, ScraperConfig, RawEvent } from '../base-scraper';
import { parseHTML } from '../html-parser';

export class PennsylvaniaScraper extends BaseScraper {
  constructor() {
    const config: ScraperConfig = {
      stateCode: 'PA',
      stateName: 'Pennsylvania',
      websiteUrl: 'https://www.legis.state.pa.us/cfdocs/legis/home/session.cfm',
      reliability: 'high',
      updateFrequency: 6,
      maxRequestsPerMinute: 20,
      requestDelay: 500
    };

    super(config);
    this.log('🏛️ PA Scraper initialized');
  }

  protected async getPageUrls(): Promise<string[]> {
    return ['https://www.legis.state.pa.us/cfdocs/legis/home/session.cfm'];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    try {
      const events: RawEvent[] = [];
      
      const url = 'https://www.legis.state.pa.us/cfdocs/legis/home/session.cfm';
      this.log('📅 Fetching PA calendar');
      
      const html = await this.fetchPage(url);
      const $ = parseHTML(html, 'PA Legislature');
      
      $('.session-row, .committee-meeting, tr.meeting').each((_, row) => {
        const $row = $(row);
        const committee = $row.find('.committee, td:nth-child(1)').text().trim();
        const dateText = $row.find('.date, td:nth-child(2)').text().trim();
        const timeText = $row.find('.time, td:nth-child(3)').text().trim();
        const location = $row.find('.location, td:nth-child(4)').text().trim();
        
        if (committee && dateText) {
          events.push({
            name: committee,
            date: this.parseDate(dateText),
            time: this.parseTime(timeText),
            location: location || 'Pennsylvania State Capitol',
            committee: `PA Legislature - ${committee}`,
            type: 'meeting',
            detailsUrl: 'https://www.legis.state.pa.us/cfdocs/legis/home/session.cfm'
          });
        }
      });
      
      this.log(`✅ Scraped ${events.length} PA events`);
      return events;
      
    } catch (error) {
      this.log(`❌ PA scraper error: ${error}`);
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
