import * as cheerio from 'cheerio';
import { StateEvent } from '../../types/events';
import { BaseScraper, ScraperConfig } from '../base-scraper';

/**
 * Colorado Legislature Scraper
 * 
 * Extracts committee meeting schedules from the Colorado General Assembly.
 * URL: https://leg.colorado.gov/schedule
 * 
 * Data Format:
 * - HTML tables organized by date headers
 * - Each table row contains: Time, Activity (committee name), Location (room), Agenda (links), Audio (link)
 * - Date headers format: "Tue Dec 16, 2025"
 * - Agenda pages contain "Hearing Items" but typically no specific bills during interim
 * 
 * Structure:
 * <h3 class="text-center">Tue Dec 16, 2025</h3>
 * <table>
 *   <tr>
 *     <td data-label="Time"><span>9:00 AM</span></td>
 *     <td data-label="Activity"><a href="...">Capital Development Committee</a></td>
 *     <td data-label="Location"><span>SCR 357</span></td>
 *     <td data-label="Agenda"><a href="/agenda/committee/...">Agenda</a>|<a href="...">PDF</a></td>
 *     <td data-label="Audio"><a href="...">Listen</a></td>
 *   </tr>
 * </table>
 * 
 * Location: Colorado State Capitol, 200 E Colfax Avenue, Denver, CO 80203
 * Coordinates: 39.7392° N, 104.9903° W
 */
export class ColoradoScraper extends BaseScraper {
  private baseUrl = 'https://leg.colorado.gov';
  private scheduleUrl = `${this.baseUrl}/schedule`;
  
  // Denver State Capitol coordinates
  private latitude = 39.7392;
  private longitude = -104.9903;

  constructor() {
    const config: ScraperConfig = {
      stateCode: 'CO',
      stateName: 'Colorado',
      websiteUrl: 'https://leg.colorado.gov/schedule',
      reliability: 'high',
      updateFrequency: 24,
      maxRequestsPerMinute: 30,
      requestDelay: 300
    };
    super(config);
  }

  async scrapeSchedule(): Promise<StateEvent[]> {
    console.log('Fetching Colorado schedule...');
    const html = await this.fetchPage(this.scheduleUrl);
    
    if (!html) {
      console.error('Failed to fetch Colorado schedule page');
      return [];
    }

    const events = await this.parseSchedule(html);
    
    // Enrich events with agenda details
    const enrichedEvents = await this.enrichWithAgendaDetails(events);
    
    return enrichedEvents;
  }

  /**
   * Fetch agenda page and extract title and hearing items
   */
  private async fetchAgendaDetails(agendaUrl: string): Promise<{ title: string; hearingItems: string[] } | null> {
    try {
      const html = await this.fetchPage(agendaUrl);
      if (!html) return null;

      const $ = cheerio.load(html);
      
      // Extract title from h1
      const title = $('.agenda-heading').text().trim();
      
      // Extract hearing items
      const hearingItems: string[] = [];
      $('tr').each((_, row) => {
        const $row = $(row);
        const headerCell = $row.find('th[scope="row"]');
        
        if (headerCell.text().trim() === 'Hearing Item') {
          const item = $row.find('td span').text().trim();
          if (item) {
            hearingItems.push(item);
          }
        }
      });

      return { title, hearingItems };
    } catch (error) {
      console.error(`Failed to fetch agenda details from ${agendaUrl}:`, error);
      return null;
    }
  }

  /**
   * Enrich events with agenda details (title and hearing items)
   */
  private async enrichWithAgendaDetails(events: StateEvent[]): Promise<StateEvent[]> {
    const enrichedEvents: StateEvent[] = [];
    
    for (const event of events) {
      if (event.agendaUrl) {
        console.log(`Fetching agenda for: ${event.committee}`);
        const details = await this.fetchAgendaDetails(event.agendaUrl);
        
        if (details) {
          enrichedEvents.push({
            ...event,
            name: details.title || event.committee,
            description: details.hearingItems.length > 0 
              ? `Hearing Items:\n${details.hearingItems.map((item, i) => `${i + 1}. ${item}`).join('\n')}`
              : undefined
          });
        } else {
          enrichedEvents.push({
            ...event,
            name: event.committee
          });
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
      } else {
        enrichedEvents.push({
          ...event,
          name: event.committee
        });
      }
    }
    
    return enrichedEvents;
  }

  private async parseSchedule(html: string): Promise<StateEvent[]> {
    const $ = cheerio.load(html);
    const events: StateEvent[] = [];
    const now = new Date();

    // Find all schedule sections (each with an h3 date header followed by a table)
    $('.interim-schedule-table').each((_, section) => {
      // Get the date from the h3 header
      const dateHeader = $(section).find('h3.text-center').text().trim();
      const eventDate = this.parseDate(dateHeader);

      if (!eventDate || eventDate < now) {
        return; // Skip past events
      }

      // Parse all table rows in this section
      $(section).find('tbody tr').each((_, row) => {
        const $row = $(row);

        // Extract time
        const timeText = $row.find('td[data-label="Time"] span').text().trim();
        
        // Extract committee name and link
        const activityCell = $row.find('td[data-label="Activity"]');
        const committeeName = activityCell.find('a').text().trim();
        const committeeUrl = activityCell.find('a').attr('href');

        // Extract location (room)
        const location = $row.find('td[data-label="Location"] span').text().trim();

        // Extract agenda link
        const agendaCell = $row.find('td[data-label="Agenda"]');
        const agendaLink = agendaCell.find('a.link-primary').attr('href');

        // Extract audio/livestream link
        const audioCell = $row.find('td[data-label="Audio"]');
        const audioLink = audioCell.find('a').attr('href');

        if (!committeeName || !timeText) {
          return; // Skip rows without essential data
        }

        // Combine date and time
        const dateTime = this.combineDateAndTime(eventDate, timeText);
        
        if (!dateTime) {
          return;
        }

        // Generate unique ID from date, time, and committee
        const eventId = `co-${dateTime.getTime()}-${committeeName.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30)}`;
        
        const event: StateEvent = {
          id: eventId,
          state: 'CO',
          date: dateTime.toISOString(),
          time: this.formatTime(dateTime),
          committee: committeeName,
          location: `${location}, Colorado State Capitol, Denver`,
          level: 'state',
          lat: this.latitude,
          lng: this.longitude,
          bills: [], // Colorado interim schedules typically don't list specific bills
        };

        // Add agenda URL if available
        if (agendaLink) {
          event.agendaUrl = agendaLink.startsWith('http') 
            ? agendaLink 
            : `${this.baseUrl}${agendaLink}`;
        }

        // Add livestream URL if available
        if (audioLink) {
          event.livestreamUrl = audioLink;
        }

        // Add committee URL if available
        if (committeeUrl) {
          event.url = committeeUrl.startsWith('http')
            ? committeeUrl
            : `${this.baseUrl}${committeeUrl}`;
        }

        events.push(event);
      });
    });

    console.log(`Found ${events.length} Colorado committee meetings`);
    return events;
  }

  /**
   * Parse date from header like "Tue Dec 16, 2025"
   */
  private parseDate(dateStr: string): Date | null {
    try {
      // Format: "Tue Dec 16, 2025"
      const match = dateStr.match(/([A-Za-z]+)\s+([A-Za-z]+)\s+(\d+),\s+(\d{4})/);
      if (!match) {
        console.warn(`Could not parse date: ${dateStr}`);
        return null;
      }

      const [, , month, day, year] = match;
      const date = new Date(`${month} ${day}, ${year}`);
      
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date parsed: ${dateStr}`);
        return null;
      }

      return date;
    } catch (error) {
      console.error(`Error parsing date "${dateStr}":`, error);
      return null;
    }
  }

  /**
   * Combine date and time into a single Date object
   */
  private combineDateAndTime(date: Date, timeStr: string): Date | null {
    try {
      // Handle "Upon Adjournment" - set to noon as placeholder
      if (timeStr.toLowerCase().includes('upon adjournment')) {
        const combined = new Date(date);
        combined.setHours(12, 0, 0, 0);
        return combined;
      }

      // Parse time like "9:00 AM" or "1:30 PM"
      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) {
        console.warn(`Could not parse time: ${timeStr}`);
        return null;
      }

      let [, hours, minutes, ampm] = match;
      let hour = parseInt(hours, 10);
      const minute = parseInt(minutes, 10);

      // Convert to 24-hour format
      if (ampm.toUpperCase() === 'PM' && hour !== 12) {
        hour += 12;
      } else if (ampm.toUpperCase() === 'AM' && hour === 12) {
        hour = 0;
      }

      const combined = new Date(date);
      combined.setHours(hour, minute, 0, 0);

      return combined;
    } catch (error) {
      console.error(`Error combining date and time:`, error);
      return null;
    }
  }

  /**
   * Format date as 12-hour time string
   */
  private formatTime(date: Date): string {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    
    return `${displayHours}:${displayMinutes} ${ampm}`;
  }
}
