import { BaseScraper, ScraperConfig, RawEvent, BillInfo } from '../base-scraper';
import { parseHTML } from '../html-parser';

interface CAHearing {
  date: string;
  time: string;
  committee: string;
  location: string;
  agendaId?: string;
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

  getCalendarSources(): { name: string; url: string; description: string }[] {
    return [
      {
        name: 'California Assembly Daily File',
        url: 'https://assembly.ca.gov/dailyfile',
        description: 'Assembly committee hearings and floor sessions'
      },
      {
        name: 'Local City Meetings (Legistar API)',
        url: 'https://webapi.legistar.com',
        description: 'City council meetings from major California cities'
      }
    ];
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
        
        // Extract agenda ID from View Agenda link
        const agendaLink = $row.find('a[href*="/api/dailyfile/agenda/"]').attr('href');
        const agendaId = agendaLink ? agendaLink.split('/').pop() : undefined;
        
        if (date && time && committee && location) {
          hearings.push({ date, time, committee, location, agendaId });
        }
      });

      this.log(`✅ California Assembly: Found ${hearings.length} hearings`);
      
      // Convert hearings to raw events with bills
      const events: RawEvent[] = [];
      for (const hearing of hearings) {
        const event = await this.convertCAHearingToRaw(hearing, 'Assembly');
        events.push(event);
      }
      
      return events;
    } catch (error) {
      this.log(`Error scraping California Assembly: ${error}`);
      return [];
    }
  }

  private async convertCAHearingToRaw(hearing: CAHearing, chamber: string): Promise<RawEvent> {
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
    const agendaUrl = hearing.agendaId 
      ? `https://assembly.ca.gov/api/dailyfile/agenda/${hearing.agendaId}`
      : undefined;
    
    // Fetch bills from agenda if available
    let bills: BillInfo[] | undefined;
    let description: string | undefined;
    
    if (agendaUrl) {
      try {
        const agendaResult = await this.fetchBillsFromAgenda(agendaUrl);
        bills = agendaResult.bills;
        description = agendaResult.description;
      } catch (error) {
        this.log(`⚠️ Could not fetch agenda for ${hearing.committee}: ${error}`);
        description = `California ${chamber} Committee Hearing`;
      }
    } else {
      description = `California ${chamber} Committee Hearing`;
    }

    return {
      name: hearing.committee,
      date: dateStr,
      time: timeStr,
      location: locationDisplay,
      committee: `CA ${chamber} - ${hearing.committee}`,
      description: description,
      detailsUrl: agendaUrl || 'https://assembly.ca.gov/dailyfile',
      bills: bills,
      sourceUrl: 'https://assembly.ca.gov/dailyfile'
    };
  }

  private async fetchBillsFromAgenda(agendaUrl: string): Promise<{ bills: BillInfo[], description: string }> {
    const html = await this.fetchPage(agendaUrl);
    const $ = parseHTML(html);
    
    const bills: BillInfo[] = [];
    const seenBills = new Set<string>();
    
    // Parse bill measures from agenda
    $('.Measure').each((_: number, measure: any) => {
      const $measure = $(measure);
      const billLink = $measure.find('a[href*="billNavClient"]').attr('href');
      const billType = $measure.find('.MeasureType').text().trim();
      const billNum = $measure.find('.MeasureNum .MeasureNumText').parent().text().trim();
      const author = $measure.find('.Author').text().trim().replace(/\.$/, '');
      const topic = $measure.find('.Topic').text().trim();
      
      if (billLink && billType && billNum) {
        const billId = `${billType.replace(/\./g, '')} ${billNum.replace('No. ', '')}`;
        
        if (!seenBills.has(billId)) {
          seenBills.add(billId);
          bills.push({
            id: billId,
            title: topic || billId,
            url: billLink,
            status: 'Scheduled for Committee',
            sponsors: author ? [author] : undefined
          });
        }
      }
    });
    
    // Get full agenda text as description (strip HTML tags)
    let description = $('.agenda').text().trim().replace(/\s+/g, ' ');
    if (description.length > 500) {
      description = description.substring(0, 497) + '...';
    }
    
    return { bills, description: description || 'Committee meeting agenda' };
  }

}