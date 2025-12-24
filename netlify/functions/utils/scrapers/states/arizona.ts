import { BaseScraper } from '../base-scraper';
import type { RawEvent, ScraperConfig } from '../base-scraper';
import { enrichEventMetadata } from '../shared/tagging';

interface ArizonaAgenda {
  id: number;
  start: string;
  end: string;
  allDay: boolean;
  type: string;
  body: string;
  longtitle: string;
  title: string;
  location: string;
  cancelled: number;
  modified: number;
  time: string;
  interim: number;
  PDFFile: string;
  skip: boolean;
}

interface ArizonaBillDetail {
  billNumber: string;
  title: string;
  url: string;
}

/**
 * Arizona State Legislature Scraper
 * Source: https://www.azleg.gov/alis-today/
 * 
 * Arizona's ALIS (Arizona Legislative Information System):
 * - Calendar-based API endpoints
 * - Committee agendas for House, Senate, and Interim committees
 * - Bill information via separate API
 * - Real-time meeting updates
 */
export class ArizonaScraper extends BaseScraper {
  private readonly baseUrl = 'https://www.azleg.gov';
  private readonly agendaApiBase = '/azlegwp/wp-content/themes/azleg';

  constructor() {
    const config: ScraperConfig = {
      stateCode: 'AZ',
      stateName: 'Arizona',
      websiteUrl: 'https://www.azleg.gov/alis-today/',
      reliability: 'high',
      updateFrequency: 6,
      maxRequestsPerMinute: 30,
      requestDelay: 300
    };
    super(config);
    this.log('🌵 AZ Scraper initialized');
  }

  getCalendarSources(): { name: string; url: string; description: string }[] {
    return [
      {
        name: 'Arizona ALIS Today Calendar',
        url: 'https://www.azleg.gov/alis-today/',
        description: 'Daily committee meeting schedules for House, Senate, and Interim committees'
      }
    ];
  }

  protected async getPageUrls(): Promise<string[]> {
    return [`${this.baseUrl}/alis-today/`];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    try {
      const events: RawEvent[] = [];
      
      // Get date range (today + 60 days)
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 60);
      
      const start = this.formatDate(startDate);
      const end = this.formatDate(endDate);

      // Fetch only committee agendas (legislative meetings) - not Capitol Events
      const [houseAgendas, senateAgendas, interimAgendas] = await Promise.all([
        this.fetchAgendas('H', start, end),
        this.fetchAgendas('S', start, end),
        this.fetchAgendas('I', start, end)
      ]);

      const allAgendas = [...houseAgendas, ...senateAgendas, ...interimAgendas];
      
      this.log(`Found ${allAgendas.length} total agendas for Arizona`);

      // Convert agendas to events and fetch bills
      for (const agenda of allAgendas) {
        // Skip cancelled or "not meeting" agendas
        if (agenda.cancelled === 1 || agenda.skip === true) {
          continue;
        }

        const event = await this.convertAgendaToEvent(agenda);
        if (event) {
          events.push(event);
        }
      }

      // Filter out past events
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const upcomingEvents = events.filter(event => {
        const eventDate = new Date(event.date);
        if (eventDate >= today) {
          return true;
        } else {
          this.log(`Skipping past event: ${event.name} on ${event.date}`);
          return false;
        }
      });

      this.log(`Converted ${upcomingEvents.length} upcoming Arizona agendas to events`);
      
      return upcomingEvents;
    } catch (error) {
      const message = `Failed to scrape Arizona events: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.log(message);
      throw new Error(message);
    }
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private async fetchAgendas(body: string, start: string, end: string): Promise<ArizonaAgenda[]> {
    const url = `${this.baseUrl}${this.agendaApiBase}/alistodayAgendaData.php?body=${body}&start=${start}&end=${end}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const agendas = await response.json() as ArizonaAgenda[];
      return Array.isArray(agendas) ? agendas : [];
    } catch (error) {
      this.log(`Error fetching ${body} agendas: ${error instanceof Error ? error.message : 'Unknown'}`);
      return [];
    }
  }

  private async fetchCapitolEvents(start: string, end: string): Promise<ArizonaAgenda[]> {
    const url = `${this.baseUrl}${this.agendaApiBase}/alistodayCapEvtData.php?start=${start}&end=${end}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const events = await response.json() as ArizonaAgenda[];
      return Array.isArray(events) ? events : [];
    } catch (error) {
      this.log(`Error fetching Capitol events: ${error instanceof Error ? error.message : 'Unknown'}`);
      return [];
    }
  }



  private async extractMeetingLinkFromPdf(pdfUrl: string): Promise<string | null> {
    try {
      const response = await fetch(pdfUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        return null;
      }

      const buffer = await response.arrayBuffer();
      const text = Buffer.from(buffer).toString('utf8');
      
      // Extract videoplayer URL from PDF metadata
      const videoMatch = text.match(/https:\/\/www\.azleg\.gov\/videoplayer\/\?clientID=\d+&eventID=\d+/);
      if (videoMatch) {
        return videoMatch[0];
      }
      
      return null;
    } catch (error) {
      this.log(`Error extracting meeting link from PDF: ${error instanceof Error ? error.message : 'Unknown'}`);
      return null;
    }
  }

  private async convertAgendaToEvent(agenda: ArizonaAgenda): Promise<RawEvent | null> {
    try {
      // Parse date and time
      const [datePart, timePart] = agenda.start.split(' ');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hour, minute] = timePart.split(':').map(Number);
      
      const date = new Date(year, month - 1, day, hour, minute);
      
      // Determine event type and source URL
      let sourceUrl: string;
      let description: string;
      let meetingUrl: string | null = null;
      
      if (agenda.type === 'misc') {
        // Capitol Event
        sourceUrl = `${this.baseUrl}/alis-today/?sdate=${datePart}&view=2&dftvl=all`;
        description = `Capitol event at ${agenda.body || agenda.location}`;
      } else {
        // Committee meeting
        const bodyName = agenda.body === 'H' ? 'House' : agenda.body === 'S' ? 'Senate' : 'Interim';
        sourceUrl = agenda.PDFFile ? `${this.baseUrl}${agenda.PDFFile}` : `${this.baseUrl}/alis-today/?sdate=${datePart}&view=2&dftvl=all`;
        description = `${bodyName} committee meeting`;
        
        // Extract meeting link from PDF if available
        if (agenda.PDFFile) {
          const pdfUrl = `${this.baseUrl}${agenda.PDFFile}`;
          meetingUrl = await this.extractMeetingLinkFromPdf(pdfUrl);
        }
      }
      
      const event: RawEvent = {
        name: agenda.longtitle || agenda.title,
        date: date.toISOString(),
        time: agenda.time || date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        location: agenda.location || agenda.body,
        committee: agenda.longtitle || agenda.title,
        description,
        sourceUrl,
        virtualMeetingUrl: meetingUrl || undefined
      };
      
      return event;
    } catch (error) {
      this.log(`Error converting agenda ${agenda.id}: ${error instanceof Error ? error.message : 'Unknown'}`);
      return null;
    }
  }
}
