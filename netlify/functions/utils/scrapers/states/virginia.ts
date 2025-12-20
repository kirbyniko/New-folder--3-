import { BaseScraper } from '../base-scraper';
import type { RawEvent, ScraperConfig, BillInfo } from '../base-scraper';
import { enrichEventMetadata } from '../shared/tagging';
import { parseHTML } from '../html-parser';
import puppeteer from 'puppeteer';

/**
 * Virginia General Assembly Scraper (Puppeteer-based)
 * Source: https://lis.virginia.gov/
 * 
 * Virginia's Legislative Information System (LIS) uses React SPA:
 * - Requires JavaScript rendering via Puppeteer
 * - Agenda PDFs with bill listings
 * - Committee meeting details
 * - Video streaming links
 * 
 * 2026 Session starts: January 14, 2026
 * Data coverage: Committee meetings, subcommittees, caucuses, public hearings
 */
export class VirginiaScraper extends BaseScraper {
  private readonly BASE_URL = 'https://lis.virginia.gov';
  private readonly SCHEDULE_URL = `${this.BASE_URL}/schedule`;
  private readonly CURRENT_SESSION = '20261'; // 2026 Session
  private readonly BILL_SEARCH_URL = `${this.BASE_URL}/cgi-bin/legp604.exe`; // Bill lookup endpoint

  constructor() {
    const config: ScraperConfig = {
      stateCode: 'VA',
      stateName: 'Virginia',
      websiteUrl: 'https://lis.virginia.gov',
      reliability: 'medium', // Puppeteer adds some overhead
      updateFrequency: 6, // Check every 4 hours
      maxRequestsPerMinute: 20, // Lower due to browser overhead
      requestDelay: 500
    };
    super(config);
    this.log('🏛️ VA Scraper initialized (Puppeteer mode)');
  }

  getCalendarSources(): { name: string; url: string; description: string }[] {
    return [
      {
        name: 'Virginia Legislative Information System',
        url: 'https://lis.virginia.gov/schedule',
        description: 'Daily schedule of House and Senate committee meetings'
      }
    ];
  }

  protected async getPageUrls(): Promise<string[]> {
    return [this.SCHEDULE_URL];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    this.log('📅 Starting Virginia calendar scrape (Puppeteer)');
    const allEvents: RawEvent[] = [];
    let browser = null;

    try {
      // Launch headless browser
      this.log('🌐 Launching Puppeteer browser');
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      
      // Set viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      // Navigate to schedule page
      this.log(`🌐 Navigating to ${this.SCHEDULE_URL}`);
      await page.goto(this.SCHEDULE_URL, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Wait for React to render events
      this.log('⏳ Waiting for schedule to render');
      await page.waitForSelector('h4, .schedule-date, [class*="date"]', { timeout: 10000 });

      // Get rendered HTML
      const html = await page.content();
      const $ = parseHTML(html);

      this.log('📄 Parsing rendered schedule page');

      // Walk through the DOM and track current date as we encounter h4 and events
      let currentDate: Date | null = null;
      
      // Find the main container
      const mainContainer = $('.section-side-padding, .meeting-day, body').first();
      
      // Iterate through all children in order
      mainContainer.find('*').each((_, element) => {
        const $el = $(element);
        
        // Check if this is a date header
        if ($el.is('h4') || $el.find('h4').length > 0) {
          const h4 = $el.is('h4') ? $el : $el.find('h4').first();
          const dateText = h4.text().trim();
          const parsedDate = this.parseEventDate(dateText);
          if (parsedDate) {
            currentDate = parsedDate;
            this.log(`📆 Processing date: ${dateText}`);
          }
        }
        
        // Check if this is a schedule event
        if ($el.hasClass('schedule-event')) {
          try {
            const $event = $el;
            
            if (!currentDate) return;
            
            // Extract time
            const timeText = $event.find('.txt-greyed, .public-time-wrapper').text().trim();
            if (!timeText) return;

            // Extract committee name
            const committeeText = $event.find('.schedule-title').text().trim();
            if (!committeeText) return;

            // Extract location
            const locationSpan = $event.find('.public-schedule-event > div > div > span').eq(1);
            let location = locationSpan.text().trim() || 'Virginia State Capitol';
            
            // Look for location in description
            const descriptionDiv = $event.find('[style*="overflow-wrap"]');
            const descriptionText = descriptionDiv.text().trim();
            
            const locationMatch = descriptionText.match(/([^<]+?)(?=\s*\(|$)/);
            if (locationMatch && locationMatch[1] && locationMatch[1].length > location.length) {
              location = locationMatch[1].trim();
            }

            // Find links
            const agendaLink = $event.find('a[href*=".PDF"], a[href*=".pdf"]').attr('href');
            const committeeInfoLink = $event.find('a[href*="committee-information"]').first().attr('href');

            // Clone the current date for this event
            const eventDate = new Date(currentDate.getTime());

            // Parse time
            const timeParts = timeText.match(/(\d{1,2}):(\d{2})\s*([AP]M)/i);
            if (timeParts) {
              let hours = parseInt(timeParts[1]);
              const minutes = parseInt(timeParts[2]);
              const meridiem = timeParts[3].toUpperCase();

              if (meridiem === 'PM' && hours !== 12) hours += 12;
              if (meridiem === 'AM' && hours === 12) hours = 0;

              eventDate.setHours(hours, minutes, 0, 0);
            }

            // Create event
            const event: RawEvent = {
              name: committeeText,
              committee: this.extractCommitteeName(committeeText),
              date: eventDate.toISOString(),
              location,
              description: descriptionText || `Meeting of ${committeeText}`,
              sourceUrl: committeeInfoLink 
                ? (committeeInfoLink.startsWith('http') ? committeeInfoLink : `${this.BASE_URL}${committeeInfoLink}`)
                : this.SCHEDULE_URL,
              scrapedAt: new Date().toISOString()
            };

            // Add agenda URL (will parse PDFs later)
            if (agendaLink) {
              const fullAgendaUrl = agendaLink.startsWith('http') ? agendaLink : `${this.BASE_URL}${agendaLink}`;
              event.agendaUrl = fullAgendaUrl;
            }

            allEvents.push(event);

          } catch (error) {
            this.log(`⚠️ Error parsing event: ${error instanceof Error ? error.message : error}`);
          }
        }
      });

      this.log(`✅ Scraped ${allEvents.length} VA events`);

      // Parse PDFs to extract bills (do this after collecting all events)
      this.log(`📄 Parsing ${allEvents.filter(e => e.agendaUrl).length} PDF agendas for bills...`);
      await Promise.all(
        allEvents.map(async (event) => {
          if (event.agendaUrl) {
            try {
              const bills = await this.parsePdfAgenda(event.agendaUrl);
              if (bills.length > 0) {
                event.bills = bills;
                this.log(`📋 Extracted ${bills.length} bills from ${event.committee}`);
              }
            } catch (error) {
              this.log(`⚠️ Could not parse PDF for ${event.committee}: ${error instanceof Error ? error.message : error}`);
            }
          }
        })
      );

      const eventsWithBills = allEvents.filter(e => e.bills && e.bills.length > 0);
      this.log(`✅ Completed: ${eventsWithBills.length} events have bills`);
      
      return allEvents;

    } catch (error) {
      this.log(`❌ Error scraping Virginia: ${error instanceof Error ? error.message : error}`);
      throw error;
    } finally {
      // Always close the browser
      if (browser) {
        await browser.close();
        this.log('🔒 Browser closed');
      }
    }
  }

  /**
   * Parse date header text into Date object
   */
  private parseEventDate(dateText: string): Date | null {
    try {
      // Format: "Tuesday, December 16th, 2025"
      // Remove day of week and ordinal suffixes
      const cleaned = dateText
        .replace(/^[A-Za-z]+,\s*/, '') // Remove "Tuesday, "
        .replace(/(\d+)(st|nd|rd|th)/, '$1'); // Remove ordinal suffixes
      
      const date = new Date(cleaned);
      if (!isNaN(date.getTime())) {
        return date;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Parse individual event from HTML element
   */
  private parseEvent(element: any, eventDate: Date, $: any): RawEvent | null {
    try {
      const text = element.text().trim();
      
      // Extract time (e.g., "8:00 AM", "10:00 AM")
      const timeMatch = text.match(/(\d{1,2}:\d{2}\s*[AP]M)/i);
      if (!timeMatch) return null;

      const timeString = timeMatch[1];
      const timeParts = timeString.match(/(\d{1,2}):(\d{2})\s*([AP]M)/i);
      if (!timeParts) return null;

      let hours = parseInt(timeParts[1]);
      const minutes = parseInt(timeParts[2]);
      const meridiem = timeParts[3].toUpperCase();

      if (meridiem === 'PM' && hours !== 12) hours += 12;
      if (meridiem === 'AM' && hours === 12) hours = 0;

      const meetingDate = new Date(eventDate);
      meetingDate.setHours(hours, minutes, 0, 0);

      // Extract committee name (text before location)
      const nameMatch = text.match(/[AP]M\s+(.+?)(?:\n|$)/);
      const name = nameMatch ? nameMatch[1].trim() : text.substring(timeString.length).trim();

      // Extract location (usually after committee name)
      const locationMatch = text.match(/(?:House|Senate|Library|Virtual|General Assembly Building|Capitol).*$/m);
      const location = locationMatch ? locationMatch[0].trim() : 'Virginia State Capitol';

      // Find agenda link
      const agendaLink = element.find('a[href*="blob.core.windows.net"], a:contains("Agenda")').first();
      const agendaUrl = agendaLink.length ? this.resolveUrl(agendaLink.attr('href')) : undefined;

      // Find committee info link
      const committeeLink = element.find('a[href*="committee-information"]').first();
      const committeeUrl = committeeLink.length ? this.resolveUrl(committeeLink.attr('href')) : undefined;

      // Find video link
      const videoLink = element.find('a:contains("View Meeting")').first();
      const videoUrl = videoLink.length ? this.resolveUrl(videoLink.attr('href')) : undefined;

      // Determine committee name from links or text
      const committee = this.extractCommitteeName(name);

      // Build source URL
      const sourceUrl = committeeUrl || this.SCHEDULE_URL;

      const event: RawEvent = {
        name: name.split('\n')[0].trim(),
        date: meetingDate.toISOString(),
        time: timeString,
        location,
        committee,
        type: 'hearing',
        sourceUrl
      };

      // Add optional fields
      if (agendaUrl) {
        event.description = `Agenda: ${agendaUrl}`;
      }

      return event;

    } catch (error) {
      this.log(`⚠️ Failed to parse event: ${error instanceof Error ? error.message : error}`);
      return null;
    }
  }

  /**
   * Parse event from structured container
   */
  private parseEventContainer(element: any, $: any): RawEvent | null {
    try {
      // This is a fallback parser for differently structured events
      const time = element.find('time, .time, [class*="time"]').first().text().trim();
      const name = element.find('.name, .title, h3, h4, h5').first().text().trim();
      const location = element.find('.location, [class*="location"]').first().text().trim();
      
      if (!time || !name) return null;

      // Basic event structure
      return {
        name,
        date: new Date().toISOString(), // Will need proper date parsing
        time,
        location: location || 'Virginia State Capitol',
        committee: this.extractCommitteeName(name),
        type: 'hearing',
        sourceUrl: this.SCHEDULE_URL
      };
    } catch {
      return null;
    }
  }

  /**
   * Extract clean committee name from event text
   */
  private extractCommitteeName(text: string): string {
    // Remove common prefixes/suffixes
    let committee = text
      .replace(/^Joint Meeting of\s+/i, '')
      .replace(/\s+Committee$/i, '')
      .trim();

    // Handle joint meetings (e.g., "Senate Education and Health and House Education")
    if (committee.includes(' and ') && !committee.includes('Committee')) {
      committee = committee.split(' and ').map(c => c.trim()).join(' / ');
    }

    return committee;
  }

  /**
   * Extract bill title from PDF context text
   */
  private extractBillTitle(billId: string, context: string): string {
    if (!context || context.length < 5) {
      return this.generatePlaceholderTitle(billId);
    }

    // Clean up context: remove extra whitespace, newlines, PDF artifacts
    let cleaned = context
      .replace(/[\r\n]+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E]/g, '') // Remove non-printable chars
      .trim();

    // If cleaned text is mostly garbage characters (< 70% readable), use placeholder
    // Count only letters and spaces as readable (numbers/punctuation can be PDF artifacts)
    const letterChars = cleaned.replace(/[^a-zA-Z\s]/g, '').length;
    const totalChars = cleaned.length;
    const wordCount = cleaned.split(/\s+/).filter(w => w.length > 2 && /[a-zA-Z]/.test(w)).length;
    
    if (totalChars === 0 || letterChars / totalChars < 0.7 || wordCount < 3) {
      return this.generatePlaceholderTitle(billId);
    }

    // Stop at common delimiters that indicate end of title
    const stopPatterns = [
      /\bPatron[s]?:/i,
      /\bSponsor[s]?:/i,
      /\bCommittee:/i,
      /\bSubcommittee:/i,
      /\d{1,2}\/\d{1,2}\/\d{2,4}/, // Date pattern
      /\b(HB|SB|HJ|SJ|HCR|SCR)\s*\d+/i, // Next bill ID
      /\bPage\s+\d+/i,
    ];

    for (const pattern of stopPatterns) {
      const match = cleaned.match(pattern);
      if (match && match.index !== undefined && match.index > 10) {
        cleaned = cleaned.substring(0, match.index).trim();
      }
    }

    // If we have a good title (more than just bill number), use it
    if (cleaned.length > billId.length + 10) {
      // Capitalize first letter
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      
      // Ensure it ends with proper punctuation or clean cutoff
      if (!/[.!?]$/.test(cleaned) && cleaned.length > 100) {
        cleaned = cleaned.substring(0, 100) + '...';
      }
      
      return `${billId} - ${cleaned}`;
    }

    return this.generatePlaceholderTitle(billId);
  }

  /**
   * Generate placeholder title based on bill type
   */
  private generatePlaceholderTitle(billId: string): string {
    const [billType] = billId.split(' ');
    
    const typeDescriptions: Record<string, string> = {
      'HB': 'House Bill',
      'SB': 'Senate Bill',
      'HJ': 'House Joint Resolution',
      'SJ': 'Senate Joint Resolution',
      'HCR': 'House Concurrent Resolution',
      'SCR': 'Senate Concurrent Resolution'
    };
    
    const description = typeDescriptions[billType] || 'Legislative Bill';
    return `${billId} - ${description} (Details pending - 2026 Session starts Jan 14)`;
  }

  /**
   * Download and parse PDF agenda to extract bills
   */
  private async parsePdfAgenda(pdfUrl: string): Promise<BillInfo[]> {
    const bills: BillInfo[] = [];

    try {
      this.log(`📄 Downloading agenda PDF: ${pdfUrl}`);
      
      // Fetch the PDF as a buffer
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Parse PDF to extract text
      let text = '';
      try {
        const { PDFParse } = await import('pdf-parse');
        const parser = new PDFParse({ verbosity: 0 });
        const pdfData = await parser.parseDocument(buffer);
        text = pdfData.text || '';
      } catch (pdfError) {
        // Fallback: Extract text directly from PDF buffer (crude but works for bill numbers)
        this.log(`⚠️ PDF parsing failed, using fallback: ${pdfError instanceof Error ? pdfError.message : pdfError}`);
        text = buffer.toString('utf8');
      }
      
      this.log(`📄 Extracted ${text.length} chars from PDF`);
      
      // Extract bill references with context for better titles
      // Virginia bill formats: HB 123, SB 456, HJ 78, SJ 90, HCR 12, SCR 34
      // Pattern: Bill ID followed by optional dash/colon and description text
      const billPattern = /(HB|SB|HJ|SJ|HCR|SCR)\s*(\d+)[\s\-–:]*([^\n\r]{0,200})/gi;
      const matches = text.matchAll(billPattern);

      const seenBills = new Set<string>();

      for (const match of matches) {
        const billType = match[1].toUpperCase();
        const billNumber = match[2];
        const billId = `${billType} ${billNumber}`;
        const context = match[3]?.trim() || '';

        if (!seenBills.has(billId)) {
          seenBills.add(billId);
          
          // Try to extract meaningful title from context
          let title = this.extractBillTitle(billId, context);
          
          // Generate correct bill URL
          // Virginia uses legacy CGI format for historical bills
          // Format: https://legacylis.virginia.gov/cgi-bin/legp604.exe?241+sum+HB4
          // Session codes: 241 = 2024 Regular Session, 251 = 2025 Special, 261 = 2026 Regular
          
          // Try to determine session from context or use current planning session (2024 bills for 2026 planning)
          // December 2025 interim meetings reference 2024 session bills
          const sessionCode = '241'; // Default to 2024 session for interim meetings
          
          // Use legacy LIS URL which has historical bill data
          const billUrl = `https://legacylis.virginia.gov/cgi-bin/legp604.exe?${sessionCode}+sum+${billType}${billNumber}`;
          
          bills.push({
            id: billId,
            title: title.substring(0, 150), // Limit length
            url: billUrl,
            status: 'Scheduled for Committee',
            sponsors: []
          });
        }
      }

      this.log(`📋 Extracted ${bills.length} bills from PDF`);
      
      // Enhance bills with details from Virginia's API if available
      await this.enhanceBillsWithDetails(bills);
      
      return bills;

    } catch (error) {
      this.log(`⚠️ Failed to parse PDF agenda: ${error instanceof Error ? error.message : error}`);
      return bills;
    }
  }

  /**
   * Enhance bills with details from Virginia's Legislative Information System
   */
  private async enhanceBillsWithDetails(bills: BillInfo[]): Promise<void> {
    // Enhance all bills since we have valid URLs now
    for (const bill of bills) {
      try {
        this.log(`🔍 Fetching details for ${bill.id} from ${bill.url}...`);
        
        // Fetch bill page from legacy LIS with retry logic
        let response: Response | null = null;
        let lastError: Error | null = null;
        
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            response = await fetch(bill.url, { 
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
              signal: AbortSignal.timeout(8000) // 8 second timeout per bill
            });
            
            if (response.ok) {
              break; // Success, exit retry loop
            } else if (response.status === 404) {
              this.log(`⚠️ Bill ${bill.id} not found (404) - may not exist in 2024 session`);
              response = null;
              break; // Don't retry 404s
            } else {
              this.log(`⚠️ HTTP ${response.status} for ${bill.id} (attempt ${attempt}/3)`);
              response = null;
            }
          } catch (error) {
            lastError = error as Error;
            this.log(`⚠️ Fetch error for ${bill.id} (attempt ${attempt}/3): ${lastError.message}`);
            if (attempt < 3) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
            }
          }
        }
        
        if (!response || !response.ok) {
          this.log(`⚠️ Failed to fetch ${bill.id} after 3 attempts`);
          continue;
        }
        
        const html = await response.text();
        
        // Virginia legacy LIS HTML structure:
        // Title is usually in format: HOUSE BILL NO. 123 or SENATE BILL NO. 456
        // Summary follows after bill number
        
        // Extract bill title/summary from main content
        // Pattern: Look for bill description after bill number heading
        const titlePatterns = [
          // Main bill title in h3 with class topLine (e.g., "SB  2 Assault firearms & certain ammunition, etc.; purchase, possession, sale, transfer, etc., prohibited.")
          /<h3[^>]*class="topLine"[^>]*>([^<]+)<\/h3>/i,
          // Summary section after "SUMMARY AS PASSED:" or "SUMMARY:"
          /<h4>SUMMARY[^<]*:<[^>]*>.*?<\/h4>\s*<p[^>]*><b>([^<]+)<\/b>/is,
          /<b>SUMMARY:\s*<\/b>\s*([^<]+)/i,
        ];
        
        let extractedTitle = '';
        for (const pattern of titlePatterns) {
          const match = html.match(pattern);
          if (match && match[1]) {
            let text = match[1].trim()
              .replace(/\s+/g, ' ')
              .replace(/&nbsp;/g, ' ')
              .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(code))
              .replace(/&[a-z]+;/gi, ''); // Remove HTML entities
            
            // For h3 title, remove the bill number prefix
            text = text.replace(/^(HB|SB|HJ|SJ|HCR|SCR)\s*\d+\s*/i, '').trim();
            
            if (text.length > 15 && !text.match(/^\d{4}/) && !text.toUpperCase().includes('LEGISLATIVE')) {
              extractedTitle = text;
              break;
            }
          }
        }
        
        if (extractedTitle) {
          bill.title = `${bill.id} - ${extractedTitle.substring(0, 120)}`;
          this.log(`✅ Enhanced ${bill.id}: ${extractedTitle.substring(0, 60)}...`);
        }
        
        // Extract patron/sponsor (Virginia uses "Introduced by:" label)
        const patronPatterns = [
          /Introduced by:\s*<a[^>]*>([^<]+)<\/a>/i, // Main introducer in link
          /Patron[s]?[:\s-]+([^<\n\r]+?)(?:<|Referred|House|Senate|\n)/i,
          /<b>Chief Patron[s]?:<\/b>\s*([^<\n]+)/i,
        ];
        
        for (const pattern of patronPatterns) {
          const patronMatch = html.match(pattern);
          if (patronMatch && patronMatch[1]) {
            const patronText = patronMatch[1].trim()
              .replace(/\s+/g, ' ')
              .replace(/&nbsp;/g, ' ');
            
            const patrons = patronText.split(/[,;]/)
              .map(p => p.trim())
              .filter(p => p.length > 2 && p.length < 50);
            
            if (patrons.length > 0) {
              bill.sponsors = patrons;
              this.log(`👤 Found ${patrons.length} sponsor(s) for ${bill.id}`);
              break;
            }
          }
        }
        
        // Extract status from history (find last history entry in list)
        const historyMatch = html.match(/<h4>HISTORY<\/h4>[\s\S]*?<ul class="linkSect">([\s\S]*?)<\/ul>/i);
        if (historyMatch) {
          // Get all list items
          const historyItems = historyMatch[1].match(/<li>([^<]*(?:<[^>]+>[^<]*)*?)<\/li>/gi);
          if (historyItems && historyItems.length > 0) {
            // Get the last item (most recent action)
            const lastItem = historyItems[historyItems.length - 1];
            const statusText = lastItem
              .replace(/<[^>]+>/g, '') // Remove HTML tags
              .replace(/&nbsp;/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
            
            if (statusText.length > 5) {
              bill.status = statusText.substring(0, 150);
              this.log(`📊 Status for ${bill.id}: ${bill.status.substring(0, 50)}...`);
            }
          }
        }
        
        // Small delay between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        this.log(`⚠️ Failed to enhance ${bill.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Bill will keep the placeholder title
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
    return url;
  }
}
