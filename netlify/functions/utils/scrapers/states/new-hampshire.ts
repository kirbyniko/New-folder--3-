/**
 * New Hampshire Legislature Scraper
 * 
 * Fetches legislative events from JSON endpoints:
 * - House calendar: http://www.gencourt.state.nh.us/house/schedule/CalendarWS.asmx/GetEvents
 * - Senate calendar: http://www.gencourt.state.nh.us/senate/schedule/CalendarWS.asmx/GetEvents
 * 
 * These endpoints return FullCalendar.js-compatible JSON data with all upcoming events.
 */

import { BaseScraper, ScraperConfig, RawEvent } from '../base-scraper';

interface NHCalendarEvent {
  title: string;
  start: string; // ISO date string
  end: string;
  backgroundColor: string;
  url: string;
  allDay: boolean;
}

interface NHCalendarResponse {
  d: string; // JSON string that needs to be parsed
}

export class NewHampshireScraper extends BaseScraper {
  private committeeIdMap: Map<string, { id: string; chapter: string }> = new Map();
  
  constructor() {
    const config: ScraperConfig = {
      stateCode: 'NH',
      stateName: 'New Hampshire',
      websiteUrl: 'https://www.gencourt.state.nh.us/house/schedule/dailyschedule.aspx',
      reliability: 'high', // JSON endpoint is very reliable
      updateFrequency: 6, // Check every 6 hours
      maxRequestsPerMinute: 20,
      requestDelay: 500 // 500ms between requests
    };

    super(config);
    this.log('🏛️ NH Scraper initialized');
  }

  /**
   * Return calendar sources used by this scraper
   */
  getCalendarSources(): { name: string; url: string; description: string }[] {
    return [
      {
        name: 'NH House Calendar',
        url: 'https://www.gencourt.state.nh.us/house/schedule/dailyschedule.aspx',
        description: 'Official House of Representatives meeting schedule'
      },
      {
        name: 'NH Senate Calendar',
        url: 'https://www.gencourt.state.nh.us/senate/schedule/',
        description: 'Official Senate meeting schedule'
      }
    ];
  }

  /**
   * Get JSON endpoint URLs for both House and Senate calendars
   */
  protected async getPageUrls(): Promise<string[]> {
    return [
      'https://www.gencourt.state.nh.us/house/schedule/CalendarWS.asmx/GetEvents', // House JSON
      'https://www.gencourt.state.nh.us/senate/schedule/CalendarWS.asmx/GetEvents' // Senate JSON
    ];
  }

  /**
   * Build committee name to ID/chapter mapping
   * HARDCODED: The statstudcomm page uses JavaScript to load data dynamically,
   * making static scraping impossible. This is a temporary hardcoded mapping
   * of known committees. TODO: Find API or use headless browser.
   */
  private async buildCommitteeMapping(): Promise<void> {
    // Hardcoded mapping of known statutory/study committees
    // Format: COMMITTEE NAME → {id, chapter}
    //
    // HOW TO ADD MORE MAPPINGS:
    // 1. Run the scraper and check logs for "No docket link found"
    // 2. Visit the event details page manually (e.g., eventDetails.aspx?event=635&et=2)
    // 3. Click the "See Docket" button
    // 4. Copy the id and txtchapternumber from the resulting URL
    // 5. Add the mapping below: 'COMMITTEE NAME': { id: 'XXX', chapter: 'YY-Z:N' }
    //
    // NOTE: Only statutory/study committees have dockets. Regular House/Senate
    // committees (Finance, Education, Judiciary, etc.) do NOT appear on statstudcomm
    // and their events won't have "See Docket" buttons.
    
    // STABILITY NOTE: These IDs are database primary keys that SHOULD be stable long-term
    // (government systems rarely change them, and public URLs depend on them).
    // However, they're not guaranteed permanent. If an ID stops working:
    // 1. Visit the event page manually
    // 2. Click "See Docket" to get the new URL
    // 3. Update the ID here
    // 
    // Last verified: December 2025
    
    const knownCommittees: Record<string, { id: string; chapter: string }> = {
      // ✅ VERIFIED - Has bills on docket page:
      'STATE COMMISSION ON AGING': { id: '1451', chapter: '19-P:1' }, // RSA 19-P:1
      
      // 📋 TO BE ADDED (12 events) - High priority:
      // 'STATE VETERANS ADVISORY COMMITTEE': { id: '???', chapter: '???' },
      
      // 📋 TO BE ADDED (6 events):
      // 'ASSESSING STANDARDS BOARD': { id: '???', chapter: '???' },
      
      // 📋 TO BE ADDED (2 events each):
      // 'FISCAL COMMITTEE': { id: '???', chapter: '???' },
      // 'ADMINISTRATIVE RULES': { id: '???', chapter: '???' },
      // 'INFORMATION TECHNOLOGY COUNCIL': { id: '???', chapter: '???' },
      // 'HEALTH AND HUMAN SERVICES OVERSIGHT COMMITTEE': { id: '???', chapter: '???' },
      // 'CAPITAL PROJECT OVERVIEW COMMITTEE': { id: '???', chapter: '???' },
      // 'JOINT LEGISLATIVE PERFORMANCE AUDIT AND OVERSIGHT COMMITTEE': { id: '???', chapter: '???' },
    };
    
    for (const [name, data] of Object.entries(knownCommittees)) {
      this.committeeIdMap.set(name, data);
    }
    
    this.log(`✅ Loaded ${this.committeeIdMap.size} hardcoded committee mappings`);
    if (this.committeeIdMap.size < 5) {
      this.log(`⚠️  Only ${this.committeeIdMap.size} committee(s) mapped - many events will have no bills`);
      this.log(`💡 To add more: Visit event pages manually, click "See Docket", copy URL parameters`);
    }
  }
  
  /**
   * Get docket URL for a committee name
   */
  private getDocketUrl(committeeName: string): string | null {
    const normalizedName = committeeName.trim().toUpperCase()
      .replace(/^NH (HOUSE|SENATE) - /, ''); // Remove prefix
    
    const committee = this.committeeIdMap.get(normalizedName);
    if (committee) {
      return `https://www.gencourt.state.nh.us/statstudcomm/details.aspx?id=${committee.id}&txtchapternumber=${committee.chapter}`;
    }
    
    return null;
  }

  /**
   * Main scraping method - fetches from JSON endpoints
   */
  protected async scrapeCalendar(): Promise<RawEvent[]> {
    this.log('📅 Starting NH calendar scrape (JSON endpoints)');
    
    // Build hardcoded committee mapping
    await this.buildCommitteeMapping();

    const urls = await this.getPageUrls();
    const allEvents: RawEvent[] = [];

    // Fetch House calendar (JSON)
    try {
      const houseEvents = await this.scrapeCalendarJSON(urls[0], 'House');
      this.log('🏛️ House calendar scraped', { events: houseEvents.length });
      allEvents.push(...houseEvents);
    } catch (error) {
      this.logError('❌ Failed to scrape House calendar', error);
      // Continue to Senate even if House fails
    }

    // Fetch Senate calendar (JSON)
    try {
      const senateEvents = await this.scrapeCalendarJSON(urls[1], 'Senate');
      this.log('🏛️ Senate calendar scraped', { events: senateEvents.length });
      allEvents.push(...senateEvents);
    } catch (error) {
      this.logError('❌ Failed to scrape Senate calendar', error);
    }

    // Enrich first 3 events with bills (reduced to prevent timeout)
    const eventsToEnrich = allEvents.slice(0, 3);
    this.log(`🔍 Enriching top ${eventsToEnrich.length} events with bill data...`);
    
    let enrichedCount = 0;
    for (const event of eventsToEnrich) {
      if (event.detailsUrl) {
        const enriched = await this.enrichEventWithRegex(event);
        if (enriched) enrichedCount++;
      }
    }

    this.log('✅ NH scrape complete', {
      totalEvents: allEvents.length,
      enrichedWithBills: enrichedCount,
      house: allEvents.filter(e => e.committee?.includes('House')).length,
      senate: allEvents.filter(e => e.committee?.includes('Senate')).length
    });

    return allEvents;
  }

  /**
   * Scrape calendar from JSON endpoint (ASMX Web Service - requires GET with JSON content-type)
   */
  private async scrapeCalendarJSON(url: string, chamber: string): Promise<RawEvent[]> {
    this.log(`📡 Fetching ${chamber} calendar JSON via GET`, { url });

    try {
      // ASMX Web Services can accept GET with proper content-type header
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/javascript, */*'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      
      this.log(`📄 Response received`, { 
        chamber,
        length: text.length,
        preview: text.substring(0, 100)
      });

      // Try to parse as JSON directly first
      try {
        const directJson = JSON.parse(text);
        if (directJson && directJson.d) {
          this.log(`✅ Direct JSON parse successful`, { chamber });
          const events = JSON.parse(directJson.d);
          this.log(`✅ Parsed ${chamber} events from .d property`, { count: events.length });
          return this.processCalendarEvents(events, chamber);
        }
      } catch (e) {
        this.log(`ℹ️ Not direct JSON, trying regex parse`, { chamber });
      }

      // Parse the response - it comes as { d: "JSON_STRING" }
      const jsonMatch = text.match(/"d"\s*:\s*"([^"]+)"/);
      if (!jsonMatch) {
        this.logError(`❌ Failed to parse JSON response for ${chamber}`, { 
          textPreview: text.substring(0, 500),
          textLength: text.length
        });
        return [];
      }

      // Unescape the JSON string
      const jsonString = jsonMatch[1]
        .replace(/\\"/g, '"')
        .replace(/\\r/g, '\r')
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t');

      const calendarEvents: NHCalendarEvent[] = JSON.parse(jsonString);
      this.log(`✅ Parsed ${chamber} JSON via regex`, { count: calendarEvents.length });

      return this.processCalendarEvents(calendarEvents, chamber);

    } catch (error) {
      this.logError(`❌ Failed to scrape ${chamber} calendar JSON`, error, {
        chamber,
        url,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      });
      return [];
    }
  }

  /**
   * Process calendar events array into RawEvents
   */
  private processCalendarEvents(calendarEvents: NHCalendarEvent[], chamber: string): RawEvent[] {
    this.log(`🔄 Processing ${chamber} calendar events`, { count: calendarEvents.length });

    // Convert to RawEvent format
    const events: RawEvent[] = calendarEvents
      .map(event => this.convertNHEventToRaw(event, chamber))
      .filter(event => event !== null) as RawEvent[];

    this.log(`✅ Converted ${chamber} events`, { 
      count: events.length,
      sample: events[0] ? {
        name: events[0].name,
        date: events[0].date instanceof Date ? events[0].date.toISOString() : events[0].date,
        rawDate: events[0].date
      } : 'none'
    });

    // Filter to only future events
    const now = new Date();
    this.log(`⏰ Current time for filtering`, {
      now: now.toISOString(),
      nowTimestamp: now.getTime()
    });

    const futureEvents = events.filter(event => {
      const eventDate = event.date instanceof Date ? event.date : new Date(event.date);
      const isFuture = eventDate >= now;
      if (!isFuture && events.indexOf(event) < 3) {
        // Log first few filtered events for debugging
        this.log(`🗑️ Filtered out past event`, {
          name: event.name,
          eventDate: eventDate.toISOString(),
          eventTimestamp: eventDate.getTime(),
          isPast: !isFuture
        });
      }
      return isFuture;
    });

    this.log(`📅 ${chamber} future events`, {
      total: events.length,
      future: futureEvents.length,
      sample: futureEvents[0] ? { 
        name: futureEvents[0].name, 
        date: futureEvents[0].date instanceof Date ? futureEvents[0].date.toISOString() : futureEvents[0].date
      } : 'none'
    });

    return futureEvents;
  }

  /**
   * Convert NH calendar event to RawEvent format
   */
  private convertNHEventToRaw(nhEvent: NHCalendarEvent, chamber: string): RawEvent | null {
    try {
      const date = new Date(nhEvent.start);
      
      // Extract time from ISO string
      const time = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      // Parse location from title (format: "COMMITTEE : Location")
      const [committee, ...locationParts] = nhEvent.title.split(' : ');
      const location = locationParts.join(' : ').trim() || 'TBD';

      // Build details URL
      const baseUrl = chamber === 'House' 
        ? 'https://www.gencourt.state.nh.us/house/schedule/'
        : 'https://www.gencourt.state.nh.us/senate/schedule/';
      const detailsUrl = nhEvent.url ? `${baseUrl}${nhEvent.url}` : undefined;

      return {
        name: committee.trim(),
        date: date,
        time: time,
        location: location,
        committee: `NH ${chamber} - ${committee.trim()}`,
        type: this.determineEventType(nhEvent.backgroundColor),
        detailsUrl: detailsUrl,
        sourceUrl: this.config.websiteUrl
      };

    } catch (error) {
      this.logError('⚠️ Failed to convert NH event', { event: nhEvent, error });
      return null;
    }
  }

  /**
   * Determine event type from color code
   * BLUE = Hearing | GREEN = Meeting | ORANGE = Executive Session | RED = Committee of Conference
   */
  private determineEventType(backgroundColor: string): string {
    const color = backgroundColor.toLowerCase();
    if (color.includes('2980b9') || color.includes('blue')) return 'hearing';
    if (color.includes('66a362') || color.includes('green')) return 'meeting';
    if (color.includes('d68100') || color.includes('orange')) return 'executive-session';
    if (color.includes('b74545') || color.includes('ff3333') || color.includes('red')) return 'committee-of-conference';
    return 'meeting'; // Default
  }

  /**
   * Helper: Check if text looks like a date (kept for potential future use)
   * @param _text unused parameter
   * @returns always false
   */
  private looksLikeDate(_text: string): boolean {
    // Placeholder method - kept for potential future HTML parsing
    return false;
    // Check for common date patterns
    // const patterns = [
    //   /\d{1,2}\/\d{1,2}\/\d{2,4}/, // 1/15/2025
    //   /\d{4}-\d{2}-\d{2}/, // 2025-01-15
    //   /[A-Z][a-z]+\s+\d{1,2},?\s+\d{4}/, // January 15, 2025
    //   /[A-Z][a-z]+\s+\d{1,2}/ // January 15
    // ];
    // return patterns.some(pattern => pattern.test(text));
  }

  /**
   * Enrich events in background without blocking initial response
   */
  private async enrichEventsInBackground(events: RawEvent[]): Promise<void> {
    this.log('🔄 Background enrichment started', { total: events.length });
    let enrichedCount = 0;
    
    for (const event of events) {
      if (event.detailsUrl) {
        await this.sleep(this.config.requestDelay || 500);
        const enriched = await this.enrichEventWithRegex(event);
        if (enriched) {
          enrichedCount++;
          this.log(`📊 Progress: ${enrichedCount}/${events.length} enriched`);
        }
      }
    }
    
    this.log('✅ Background enrichment complete', { enriched: enrichedCount });
  }

  /**
   * 🆕 Enrich event with bills from docket page
   * Flow: Event Details -> Extract Docket URL -> Fetch Docket -> Scrape Bills
   */
  private async enrichEventWithRegex(event: RawEvent): Promise<boolean> {
    if (!event.detailsUrl) return false;

    try {
      this.log('📋 Enriching event', { url: event.detailsUrl, name: event.name });

      // Step 1: Fetch event details page
      const eventHtml = await this.fetchPage(event.detailsUrl);
      
      // Extract Zoom/Teams links from event details
      const zoomMatch = eventHtml.match(/https:\/\/[^\s<>"]+zoom\.us[^\s<>"]*/i);
      const teamsMatch = eventHtml.match(/https:\/\/[^\s<>"]+teams\.microsoft\.com[^\s<>"]*/i);
      
      if (zoomMatch) {
        event.virtualMeetingUrl = zoomMatch[0];
        this.log('🎥 Zoom link found', { url: event.virtualMeetingUrl });
      } else if (teamsMatch) {
        event.virtualMeetingUrl = teamsMatch[0];
        this.log('🎥 Teams link found', { url: event.virtualMeetingUrl });
      }

      // Step 2: Try to extract bills directly from event details page first
      // Pattern: Look for bill links like <a href="...billinfo...">HB621</a>
      const billPattern = /<a[^>]+href=["']([^"']*bill[^"']*)["'][^>]*>\s*((?:HB|SB|HCR|SCR)\s*\d+)\s*<\/a>/gi;
      let bills: typeof event.bills = [];
      
      // First try: Extract bills from event details page
      let match;
      while ((match = billPattern.exec(eventHtml)) !== null) {
        const billUrl = this.resolveUrl(match[1]);
        const billId = match[2].trim().replace(/\s+/g, ' ');
        
        const contextStart = Math.max(0, match.index - 300);
        const contextEnd = Math.min(eventHtml.length, match.index + 600);
        const context = eventHtml.substring(contextStart, contextEnd);
        
        let title = '';
        const titlePatterns = [
          /<\/a>[\s\S]*?<[^>]+>([^<]{10,200})<\//i,
          /Bill Number:[\s\S]*?<\/a>[\s\S]*?([A-Z][^<]{10,200})</i,
          /<td[^>]*>([^<]{10,200})<\/td>/i
        ];
        
        for (const pattern of titlePatterns) {
          const titleMatch = context.match(pattern);
          if (titleMatch && titleMatch[1]) {
            title = titleMatch[1].trim();
            if (title.length > 10) break;
          }
        }
        
        if (billId && billUrl) {
          bills.push({
            id: billId,
            title: title || 'Bill title unavailable',
            url: billUrl,
            status: 'Scheduled for Hearing',
            sponsors: [],
            tags: []
          });
        }
      }
      
      // If no bills found on event details, try to find and fetch docket page
      if (bills.length === 0) {
        const committeeName = event.committee || event.name;
        
        // Try to get docket URL from committee mapping
        const docketUrl = this.getDocketUrl(committeeName);
        
        if (docketUrl) {
          event.docketUrl = docketUrl;
          this.log('🔗 Docket URL constructed from committee mapping', { 
            committee: committeeName, 
            url: docketUrl 
          });
          
          try {
            const docketHtml = await this.fetchPage(docketUrl);
            
            // Validate that the docket page loaded correctly
            if (docketHtml.includes('Object moved') || docketHtml.includes('404') || docketHtml.includes('not found')) {
              this.log('❌ Docket ID appears invalid - committee ID may have changed!', {
                committee: committeeName,
                url: docketUrl,
                hint: 'Visit event page manually and click "See Docket" to get new ID'
              });
              return false;
            }
            
            // Reset regex lastIndex for new HTML
            billPattern.lastIndex = 0;
            
            while ((match = billPattern.exec(docketHtml)) !== null) {
              const billUrl = this.resolveUrl(match[1]);
              const billId = match[2].trim().replace(/\s+/g, ' ');
              
              const contextStart = Math.max(0, match.index - 300);
              const contextEnd = Math.min(docketHtml.length, match.index + 600);
              const context = docketHtml.substring(contextStart, contextEnd);
              
              let title = '';
              const titlePatterns = [
                /<\/a>[\s\S]*?<[^>]+>([^<]{10,200})<\//i,
                /Bill Number:[\s\S]*?<\/a>[\s\S]*?([A-Z][^<]{10,200})</i,
                /<td[^>]*>([^<]{10,200})<\/td>/i
              ];
              
              for (const pattern of titlePatterns) {
                const titleMatch = context.match(pattern);
                if (titleMatch && titleMatch[1]) {
                  title = titleMatch[1].trim();
                  if (title.length > 10) break;
                }
              }
              
              if (billId && billUrl) {
                bills.push({
                  id: billId,
                  title: title || 'Bill title unavailable',
                  url: billUrl,
                  status: 'Scheduled for Hearing',
                  sponsors: [],
                  tags: []
                });
              }
            }
            
            if (bills.length > 0) {
              this.log('📋 Bills extracted from docket page', {
                eventName: event.name,
                docketUrl,
                billCount: bills.length
              });
            }
          } catch (error) {
            this.logError('Failed to fetch docket page', error);
          }
        } else {
          event.docketUrl = event.detailsUrl;
          this.log('ℹ️ No docket link found, likely no bills for this event');
        }
      } else {
        // Found bills on event details page
        event.docketUrl = event.detailsUrl;
        this.log('📋 Bills found on event details page', {
          eventName: event.name,
          billCount: bills.length
        });
      }
      
      // Attach bills to event if any were found
      if (bills.length > 0) {
        event.bills = bills;
      }

      return true;

    } catch (error) {
      this.logError('⚠️ Failed to enrich event with regex', error, { 
        url: event.detailsUrl,
        name: event.name 
      });
      return false;
    }
  }
}
