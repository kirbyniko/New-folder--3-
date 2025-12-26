import * as cheerio from 'cheerio';
import { BaseScraper } from '../base-scraper';
import type { RawEvent, CalendarSource, ScraperConfig } from '../base-scraper';

interface MississippiEvent {
  chamber: 'House' | 'Senate';
  type: 'schedule' | 'committee' | 'calendar';
  title: string;
  date: string;
  time?: string;
  location?: string;
  description?: string;
  sourceUrl: string;
}

export class MississippiScraper extends BaseScraper {
  private readonly urls = {
    houseSchedule: 'https://www.legislature.ms.gov/calendars-and-schedules/house-schedule/',
    senateSchedule: 'https://www.legislature.ms.gov/calendars-and-schedules/senate-schedule/',
    senateCommittee: 'https://www.legislature.ms.gov/calendars-and-schedules/senate-committee-agenda/',
    houseCalendar: 'https://www.legislature.ms.gov/calendars-and-schedules/house-calendar/',
    senateCalendar: 'https://www.legislature.ms.gov/calendars-and-schedules/senate-calendar/'
  };

  private readonly capitolCoords = {
    lat: 32.2988,
    lng: -90.1848
  };

  constructor() {
    const config: ScraperConfig = {
      stateCode: 'MS',
      stateName: 'Mississippi',
      websiteUrl: 'https://www.legislature.ms.gov/calendars-and-schedules/',
      reliability: 'medium',
      updateFrequency: 12,
      maxRequestsPerMinute: 20,
      requestDelay: 300
    };
    super(config);
    this.log('🏛️ MS Scraper initialized');
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    console.log('🏛️ MISSISSIPPI SCRAPER: Starting...');
    
    try {
      // Scrape all calendar sources in parallel
      const [houseSchedule, senateSchedule, senateCommittee, houseCalendar, senateCalendar] = await Promise.all([
        this.scrapeHouseSchedule(),
        this.scrapeSenateSchedule(),
        this.scrapeSenateCommittee(),
        this.scrapeHouseCalendar(),
        this.scrapeSenateCalendar()
      ]);

      const allEvents = [
        ...houseSchedule,
        ...senateSchedule,
        ...senateCommittee,
        ...houseCalendar,
        ...senateCalendar
      ];

      console.log(`✅ MISSISSIPPI: Found ${allEvents.length} total events`);
      console.log(`   - House Schedule: ${houseSchedule.length}`);
      console.log(`   - Senate Schedule: ${senateSchedule.length}`);
      console.log(`   - Senate Committee: ${senateCommittee.length}`);
      console.log(`   - House Calendar: ${houseCalendar.length}`);
      console.log(`   - Senate Calendar: ${senateCalendar.length}`);

      // Convert to RawEvent format and enrich with metadata
      const rawEvents = allEvents.map(evt => this.convertToRawEvent(evt));
      
      // Filter future events only
      const now = new Date();
      const futureEvents = rawEvents.filter(evt => {
        const eventDate = new Date(evt.date);
        return eventDate >= now;
      });

      console.log(`📅 MISSISSIPPI: ${futureEvents.length} upcoming events`);
      return futureEvents;

    } catch (error) {
      console.error('❌ MISSISSIPPI SCRAPER ERROR:', error);
      return [];
    }
  }

  private async scrapeHouseSchedule(): Promise<MississippiEvent[]> {
    try {
      const response = await fetch(this.urls.houseSchedule);
      const html = await response.text();
      const $ = cheerio.load(html);
      const events: MississippiEvent[] = [];

      // Look for schedule content - typically in main content area or tables
      $('.entry-content, .content-area, article').find('h2, h3, h4, p, table').each((_, elem) => {
        const text = $(elem).text().trim();
        
        // Look for date patterns like "Monday, January 15, 2025" or "1/15/2025"
        const dateMatch = text.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}|(\d{1,2}\/\d{1,2}\/\d{4})/i);
        
        if (dateMatch) {
          const parsedDate = this.parseDate(dateMatch[0]);
          if (parsedDate) {
            events.push({
              chamber: 'House',
              type: 'schedule',
              title: 'House Floor Session',
              date: parsedDate,
              time: this.extractTime(text),
              location: 'House Chamber',
              description: text.substring(0, 200),
              sourceUrl: this.urls.houseSchedule
            });
          }
        }
      });

      return events;
    } catch (error) {
      console.error('Error scraping House schedule:', error);
      return [];
    }
  }

  private async scrapeSenateSchedule(): Promise<MississippiEvent[]> {
    try {
      const response = await fetch(this.urls.senateSchedule);
      const html = await response.text();
      const $ = cheerio.load(html);
      const events: MississippiEvent[] = [];

      $('.entry-content, .content-area, article').find('h2, h3, h4, p, table').each((_, elem) => {
        const text = $(elem).text().trim();
        
        const dateMatch = text.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}|(\d{1,2}\/\d{1,2}\/\d{4})/i);
        
        if (dateMatch) {
          const parsedDate = this.parseDate(dateMatch[0]);
          if (parsedDate) {
            events.push({
              chamber: 'Senate',
              type: 'schedule',
              title: 'Senate Floor Session',
              date: parsedDate,
              time: this.extractTime(text),
              location: 'Senate Chamber',
              description: text.substring(0, 200),
              sourceUrl: this.urls.senateSchedule
            });
          }
        }
      });

      return events;
    } catch (error) {
      console.error('Error scraping Senate schedule:', error);
      return [];
    }
  }

  private async scrapeSenateCommittee(): Promise<MississippiEvent[]> {
    try {
      const response = await fetch(this.urls.senateCommittee);
      const html = await response.text();
      const $ = cheerio.load(html);
      const events: MississippiEvent[] = [];

      // Look for committee meeting listings
      $('.entry-content, .content-area, article').find('h2, h3, h4, p, li, tr').each((_, elem) => {
        const text = $(elem).text().trim();
        
        // Look for committee names and dates
        if (text.match(/committee/i) && text.length > 20) {
          const dateMatch = text.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}|(\d{1,2}\/\d{1,2}\/\d{4})/i);
          
          if (dateMatch) {
            const parsedDate = this.parseDate(dateMatch[0]);
            if (parsedDate) {
              events.push({
                chamber: 'Senate',
                type: 'committee',
                title: this.extractCommitteeName(text) || 'Senate Committee Meeting',
                date: parsedDate,
                time: this.extractTime(text),
                location: 'Committee Room',
                description: text.substring(0, 200),
                sourceUrl: this.urls.senateCommittee
              });
            }
          }
        }
      });

      return events;
    } catch (error) {
      console.error('Error scraping Senate committee:', error);
      return [];
    }
  }

  private async scrapeHouseCalendar(): Promise<MississippiEvent[]> {
    try {
      const response = await fetch(this.urls.houseCalendar);
      const html = await response.text();
      const $ = cheerio.load(html);
      const events: MississippiEvent[] = [];

      // Parse calendar listings
      $('.entry-content, .content-area, article, .calendar').find('*').each((_, elem) => {
        const text = $(elem).text().trim();
        
        if (text.length > 30) {
          const dateMatch = text.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}|(\d{1,2}\/\d{1,2}\/\d{4})/i);
          
          if (dateMatch) {
            const parsedDate = this.parseDate(dateMatch[0]);
            if (parsedDate) {
              events.push({
                chamber: 'House',
                type: 'calendar',
                title: 'House Legislative Day',
                date: parsedDate,
                time: this.extractTime(text),
                location: 'House Chamber',
                description: text.substring(0, 200),
                sourceUrl: this.urls.houseCalendar
              });
            }
          }
        }
      });

      return events;
    } catch (error) {
      console.error('Error scraping House calendar:', error);
      return [];
    }
  }

  private async scrapeSenateCalendar(): Promise<MississippiEvent[]> {
    try {
      const response = await fetch(this.urls.senateCalendar);
      const html = await response.text();
      const $ = cheerio.load(html);
      const events: MississippiEvent[] = [];

      $('.entry-content, .content-area, article, .calendar').find('*').each((_, elem) => {
        const text = $(elem).text().trim();
        
        if (text.length > 30) {
          const dateMatch = text.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}|(\d{1,2}\/\d{1,2}\/\d{4})/i);
          
          if (dateMatch) {
            const parsedDate = this.parseDate(dateMatch[0]);
            if (parsedDate) {
              events.push({
                chamber: 'Senate',
                type: 'calendar',
                title: 'Senate Legislative Day',
                date: parsedDate,
                time: this.extractTime(text),
                location: 'Senate Chamber',
                description: text.substring(0, 200),
                sourceUrl: this.urls.senateCalendar
              });
            }
          }
        }
      });

      return events;
    } catch (error) {
      console.error('Error scraping Senate calendar:', error);
      return [];
    }
  }

  private parseDate(dateStr: string): string | null {
    try {
      // Handle various date formats
      let date: Date;
      
      // Format: "Monday, January 15, 2025" or "January 15, 2025"
      if (dateStr.match(/(?:January|February|March|April|May|June|July|August|September|October|November|December)/i)) {
        date = new Date(dateStr);
      }
      // Format: "1/15/2025"
      else if (dateStr.match(/\d{1,2}\/\d{1,2}\/\d{4}/)) {
        date = new Date(dateStr);
      }
      else {
        return null;
      }

      if (isNaN(date.getTime())) {
        return null;
      }

      return date.toISOString();
    } catch (error) {
      return null;
    }
  }

  private extractTime(text: string): string | undefined {
    // Look for time patterns like "10:00 AM", "2:30 PM", "Upon Adjournment"
    const timeMatch = text.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))|(?:Upon\s+Adjournment)|(?:Immediately\s+Following)/i);
    return timeMatch ? timeMatch[0] : undefined;
  }

  private extractCommitteeName(text: string): string | null {
    // Try to extract committee name from text
    const committeeMatch = text.match(/(?:Senate|House)\s+(?:Committee\s+on\s+)?([A-Z][a-z\s,&]+?)(?:Committee)?(?:\s+(?:will\s+)?meet|meeting|\s+-\s+|$)/i);
    if (committeeMatch && committeeMatch[1]) {
      return `Senate Committee on ${committeeMatch[1].trim()}`;
    }
    return null;
  }

  private convertToRawEvent(event: MississippiEvent): RawEvent {
    const eventDate = new Date(event.date);
    const titleHash = this.hashString(event.title);
    
    return {
      id: `ms-${eventDate.getTime()}-${titleHash}`,
      name: event.title,
      date: event.date,
      time: event.time || 'Time TBD',
      location: event.location || 'Mississippi State Capitol',
      committee: event.title,
      type: event.type === 'committee' ? 'committee-meeting' : 'legislative-session',
      level: 'state',
      state: 'MS',
      city: 'Jackson',
      lat: this.capitolCoords.lat,
      lng: this.capitolCoords.lng,
      zipCode: null,
      description: event.description || `${event.chamber} ${event.type}`,
      sourceUrl: event.sourceUrl,
      tags: this.generateTags(event)
    };
  }

  private generateTags(event: MississippiEvent): string[] {
    const tags: string[] = [];
    
    tags.push(event.chamber === 'House' ? 'house' : 'senate');
    
    if (event.type === 'committee') {
      tags.push('committee-meeting');
    } else if (event.type === 'schedule') {
      tags.push('floor-session');
    }
    
    // Add topic-based tags based on committee name
    const text = event.title.toLowerCase();
    if (text.includes('finance') || text.includes('budget') || text.includes('appropriations')) {
      tags.push('budget', 'finance');
    }
    if (text.includes('education')) {
      tags.push('education');
    }
    if (text.includes('health') || text.includes('medicaid')) {
      tags.push('healthcare');
    }
    if (text.includes('judiciary') || text.includes('justice')) {
      tags.push('criminal-justice');
    }
    if (text.includes('environment') || text.includes('conservation')) {
      tags.push('environment');
    }
    
    return tags;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36).substring(0, 8);
  }

  getCalendarSources(): CalendarSource[] {
    return [
      {
        name: 'Mississippi House Schedule',
        url: this.urls.houseSchedule,
        type: 'primary',
        lastChecked: new Date().toISOString(),
        status: 'active',
        notes: 'House floor session schedule'
      },
      {
        name: 'Mississippi Senate Schedule',
        url: this.urls.senateSchedule,
        type: 'primary',
        lastChecked: new Date().toISOString(),
        status: 'active',
        notes: 'Senate floor session schedule'
      },
      {
        name: 'Mississippi Senate Committee Agenda',
        url: this.urls.senateCommittee,
        type: 'supplementary',
        lastChecked: new Date().toISOString(),
        status: 'active',
        notes: 'Senate committee meetings'
      },
      {
        name: 'Mississippi House Calendar',
        url: this.urls.houseCalendar,
        type: 'supplementary',
        lastChecked: new Date().toISOString(),
        status: 'active',
        notes: 'House legislative calendar'
      },
      {
        name: 'Mississippi Senate Calendar',
        url: this.urls.senateCalendar,
        type: 'supplementary',
        lastChecked: new Date().toISOString(),
        status: 'active',
        notes: 'Senate legislative calendar'
      },
      {
        name: 'Local City Meetings (Legistar API)',
        url: 'https://webapi.legistar.com',
        type: 'supplementary',
        lastChecked: new Date().toISOString(),
        status: 'active',
        notes: 'City council meetings from Jackson and other Mississippi cities'
      }
    ];
  }
}
