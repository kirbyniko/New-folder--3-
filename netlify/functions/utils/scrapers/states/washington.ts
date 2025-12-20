import { BaseScraper } from '../base-scraper';
import type { RawEvent, ScraperConfig, BillInfo } from '../base-scraper';
import { parseHTML } from '../html-parser';

/**
 * Washington State Legislature Scraper
 * Source: https://app.leg.wa.gov/committeeschedules
 * 
 * Washington's Legislative Website:
 * - Form-based search with POST requests
 * - Committee schedules with agendas
 * - Bill information integration
 * - Video streaming availability
 * 
 * 2026 Session starts: January 13, 2026
 * Data coverage: Committee meetings, floor sessions, public hearings
 */
export class WashingtonScraper extends BaseScraper {
  private readonly BASE_URL = 'https://app.leg.wa.gov';
  private readonly SCHEDULE_URL = `${this.BASE_URL}/committeeschedules`;
  private readonly BILL_API_URL = `${this.BASE_URL}/billinfo/summary.aspx`;
  private readonly CURRENT_BIENNIUM = '2025-26'; // 2025-2026 biennium

  constructor() {
    const config: ScraperConfig = {
      stateCode: 'WA',
      stateName: 'Washington',
      websiteUrl: 'https://app.leg.wa.gov/committeeschedules',
      reliability: 'high',
      updateFrequency: 6, // Check every 6 hours
      maxRequestsPerMinute: 30,
      requestDelay: 300
    };
    super(config);
    this.log('🌲 WA Scraper initialized');
  }

  getCalendarSources(): { name: string; url: string; description: string }[] {
    return [
      {
        name: 'Washington Legislature Committee Schedules',
        url: 'https://app.leg.wa.gov/committeeschedules',
        description: 'House and Senate committee meeting schedules'
      },
      {
        name: 'Local City Meetings (Legistar API)',
        url: 'https://webapi.legistar.com',
        description: 'City council meetings from major Washington cities'
      }
    ];
  }

  protected async getPageUrls(): Promise<string[]> {
    return [this.SCHEDULE_URL];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    this.log('📅 Starting Washington calendar scrape');
    const allEvents: RawEvent[] = [];

    try {
      // Get current date and next 30 days
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      // Format dates for Washington's form (MM/DD/YYYY)
      const formatDate = (date: Date) => {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
      };

      const formData = new URLSearchParams({
        StartDate: formatDate(startDate),
        EndDate: formatDate(endDate),
        ViewType: 'Schedule'
      });

      this.log(`📋 Fetching schedules from ${formatDate(startDate)} to ${formatDate(endDate)}`);

      const response = await fetch(this.SCHEDULE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: formData.toString()
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const $ = parseHTML(html);

      this.log('📄 Parsing schedule response');

      // Washington's schedule structure: meetings grouped by date
      // Look for meeting containers
      const meetings = $('.meeting, .schedule-item, [class*="committee-meeting"]').toArray();
      
      if (meetings.length === 0) {
        // Try alternative selectors for table-based layout
        this.log('⚠️ No meetings found with primary selectors, trying alternative structure');
        
        // Check for table rows or list items
        $('tr, li').each((_, element) => {
          const $el = $(element);
          const text = $el.text().trim();
          
          // Look for committee names and times
          if (text.match(/committee/i) && (text.match(/\d{1,2}:\d{2}/) || text.match(/AM|PM/))) {
            try {
              const event = this.parseScheduleElement($, $el);
              if (event) {
                allEvents.push(event);
              }
            } catch (error) {
              this.log(`⚠️ Error parsing element: ${error instanceof Error ? error.message : error}`);
            }
          }
        });
      } else {
        this.log(`📦 Found ${meetings.length} potential meeting elements`);
        
        for (const meeting of meetings) {
          try {
            const event = this.parseScheduleElement($, $(meeting));
            if (event) {
              allEvents.push(event);
            }
          } catch (error) {
            this.log(`⚠️ Error parsing meeting: ${error instanceof Error ? error.message : error}`);
          }
        }
      }

      // If still no events, check if session hasn't started
      if (allEvents.length === 0) {
        const pageText = $('body').text();
        if (pageText.includes('No meetings scheduled') || pageText.includes('session will begin')) {
          this.log('ℹ️ No meetings currently scheduled - session may not have started');
        } else {
          this.log('⚠️ Could not find meeting data in response');
        }
      } else {
        this.log(`✅ Scraped ${allEvents.length} WA events`);
      }

      // Extract bills from events that have agendas
      await this.enhanceEventsWithBills(allEvents);

      return allEvents;

    } catch (error) {
      this.log(`❌ Error scraping Washington calendar: ${error instanceof Error ? error.message : error}`);
      throw error;
    }
  }

  /**
   * Parse a schedule element into a RawEvent
   */
  private parseScheduleElement($: ReturnType<typeof parseHTML>, element: ReturnType<typeof parseHTML>): RawEvent | null {
    try {
      // Extract committee name
      const committeeName = element.find('.committee-name, h3, h4, strong, b').first().text().trim() ||
                           element.find('td').first().text().trim();
      
      if (!committeeName || committeeName.length < 3) {
        return null;
      }

      // Extract date and time
      const dateTimeText = element.find('.date, .time, [class*="datetime"]').text().trim() ||
                          element.text();
      
      const dateMatch = dateTimeText.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\w+ \d{1,2},? \d{4})/);
      const timeMatch = dateTimeText.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/);
      
      if (!dateMatch) {
        return null;
      }

      const eventDate = new Date(dateMatch[1]);
      if (isNaN(eventDate.getTime())) {
        return null;
      }

      // Add time if available
      if (timeMatch) {
        const timeStr = timeMatch[1];
        const [hours, minutesPart] = timeStr.split(':');
        const minutes = minutesPart.replace(/[^\d]/g, '');
        const isPM = /PM/i.test(timeStr);
        let hour = parseInt(hours);
        
        if (isPM && hour !== 12) hour += 12;
        if (!isPM && hour === 12) hour = 0;
        
        eventDate.setHours(hour, parseInt(minutes) || 0, 0, 0);
      }

      // Extract location
      const location = element.find('.location, [class*="room"]').text().trim() ||
                      this.extractLocation(element.text());

      // Extract agenda URL
      const agendaLink = element.find('a[href*="agenda"], a:contains("Agenda")').first();
      const agendaUrl = agendaLink.length ? this.resolveUrl(agendaLink.attr('href')) : undefined;

      // Extract video URL
      const videoLink = element.find('a[href*="video"], a[href*="TVW"], a:contains("Video")').first();
      const videoUrl = videoLink.length ? this.resolveUrl(videoLink.attr('href')) : undefined;

      // Extract committee URL for more details
      const committeeLink = element.find('a[href*="committee"]').first();
      const sourceUrl = committeeLink.length ? 
        this.resolveUrl(committeeLink.attr('href')) : 
        this.SCHEDULE_URL;

      const event: RawEvent = {
        name: committeeName,
        committee: this.extractCommitteeName(committeeName),
        date: eventDate.toISOString(),
        location: location || 'Washington State Capitol',
        description: `Meeting of ${committeeName}`,
        sourceUrl,
        agendaUrl,
        videoUrl,
        scrapedAt: new Date().toISOString()
      };

      return event;

    } catch (error) {
      this.log(`⚠️ Error parsing element: ${error instanceof Error ? error.message : error}`);
      return null;
    }
  }

  /**
   * Extract location from text
   */
  private extractLocation(text: string): string {
    const locationMatch = text.match(/(Room|House|Senate|Capitol|Building|Virtual|Zoom)\s+[A-Z0-9\-]+/i);
    return locationMatch ? locationMatch[0].trim() : '';
  }

  /**
   * Extract clean committee name
   */
  private extractCommitteeName(fullName: string): string {
    // Remove common prefixes/suffixes
    return fullName
      .replace(/^(House|Senate|Joint)\s+/i, '')
      .replace(/\s+(Committee|Subcommittee)$/i, '')
      .trim();
  }

  /**
   * Enhance events with bill information from agendas
   */
  private async enhanceEventsWithBills(events: RawEvent[]): Promise<void> {
    for (const event of events) {
      if (!event.agendaUrl) continue;

      try {
        this.log(`📄 Fetching agenda for ${event.committee}`);
        
        const response = await fetch(event.agendaUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (!response.ok) {
          this.log(`⚠️ Could not fetch agenda: HTTP ${response.status}`);
          continue;
        }

        const html = await response.text();
        const bills = this.extractBillsFromAgenda(html);

        if (bills.length > 0) {
          event.bills = bills;
          this.log(`📋 Found ${bills.length} bills in ${event.committee} agenda`);
          
          // Enhance bills with details
          await this.enhanceBillsWithDetails(bills);
        }

        // Be respectful with rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        this.log(`⚠️ Error fetching agenda: ${error instanceof Error ? error.message : error}`);
      }
    }
  }

  /**
   * Extract bill references from agenda HTML/PDF
   */
  private extractBillsFromAgenda(html: string): BillInfo[] {
    const bills: BillInfo[] = [];
    const seenBills = new Set<string>();

    // Washington bill formats: HB 1234, SB 5678, HJR 4001, etc.
    const billPattern = /(HB|SB|HJM|SJM|HJR|SJR|HCR|SCR)\s*(\d{4})/gi;
    const matches = html.matchAll(billPattern);

    for (const match of matches) {
      const billType = match[1].toUpperCase();
      const billNumber = match[2];
      const billId = `${billType} ${billNumber}`;

      if (seenBills.has(billId)) continue;
      seenBills.add(billId);

      // Extract context around bill mention for description
      const startIdx = Math.max(0, match.index! - 100);
      const endIdx = Math.min(html.length, match.index! + 200);
      const context = html.substring(startIdx, endIdx)
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const bill: BillInfo = {
        id: billId,
        title: this.generatePlaceholderTitle(billId),
        url: this.generateBillUrl(billType, billNumber),
        status: 'In Committee',
        sponsors: []
      };

      bills.push(bill);
    }

    return bills;
  }

  /**
   * Generate Washington bill URL
   */
  private generateBillUrl(billType: string, billNumber: string): string {
    const year = new Date().getFullYear();
    return `${this.BILL_API_URL}?BillNumber=${billNumber}&Chamber=${billType.startsWith('H') ? 'House' : 'Senate'}&Year=${year}`;
  }

  /**
   * Generate placeholder title based on bill type
   */
  private generatePlaceholderTitle(billId: string): string {
    const typeDescriptions: Record<string, string> = {
      'HB': 'House Bill',
      'SB': 'Senate Bill',
      'HJM': 'House Joint Memorial',
      'SJM': 'Senate Joint Memorial',
      'HJR': 'House Joint Resolution',
      'SJR': 'Senate Joint Resolution',
      'HCR': 'House Concurrent Resolution',
      'SCR': 'Senate Concurrent Resolution'
    };

    const type = billId.split(' ')[0];
    const description = typeDescriptions[type] || 'Bill';
    return `${billId} - ${description} (Details pending - 2026 Session starts Jan 13)`;
  }

  /**
   * Enhance bills with details from Washington's API
   */
  private async enhanceBillsWithDetails(bills: BillInfo[]): Promise<void> {
    for (const bill of bills) {
      try {
        this.log(`🔍 Fetching details for ${bill.id}...`);

        // Fetch bill page
        let response: Response | null = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            response = await fetch(bill.url, {
              headers: { 'User-Agent': 'Mozilla/5.0' },
              signal: AbortSignal.timeout(8000)
            });

            if (response.ok) break;
            
            if (response.status === 404) {
              this.log(`⚠️ ${bill.id} not found - may not exist yet`);
              return;
            }

            response = null;
          } catch (error) {
            if (attempt < 3) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
          }
        }

        if (!response || !response.ok) continue;

        const html = await response.text();
        const $ = parseHTML(html);

        // Extract bill title
        const titleElement = $('.bill-title, h1, [class*="title"]').first();
        if (titleElement.length) {
          const titleText = titleElement.text().trim()
            .replace(/\s+/g, ' ')
            .replace(/^(HB|SB|HJM|SJM|HJR|SJR|HCR|SCR)\s*\d+\s*[-–—]\s*/i, '');
          
          if (titleText.length > 15) {
            bill.title = `${bill.id} - ${titleText.substring(0, 120)}`;
            this.log(`✅ Enhanced ${bill.id}: ${titleText.substring(0, 60)}...`);
          }
        }

        // Extract sponsors
        const sponsorText = $('.sponsor, [class*="prime-sponsor"]').text();
        if (sponsorText) {
          const sponsors = sponsorText
            .replace(/Prime Sponsor[s]?:/i, '')
            .split(/[,;]/)
            .map(s => s.trim())
            .filter(s => s.length > 2 && s.length < 50);
          
          if (sponsors.length > 0) {
            bill.sponsors = sponsors;
            this.log(`👤 Found ${sponsors.length} sponsor(s) for ${bill.id}`);
          }
        }

        // Extract status
        const statusText = $('.status, [class*="current-status"]').text();
        if (statusText && statusText.length > 5) {
          bill.status = statusText.trim().substring(0, 100);
        }

        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        this.log(`⚠️ Failed to enhance ${bill.id}: ${error instanceof Error ? error.message : error}`);
      }
    }
  }

  /**
   * Resolve relative URLs to absolute
   */
  private resolveUrl(url: string | undefined): string | undefined {
    if (!url) return undefined;
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return `https:${url}`;
    if (url.startsWith('/')) return `${this.BASE_URL}${url}`;
    return `${this.SCHEDULE_URL}/${url}`;
  }
}
