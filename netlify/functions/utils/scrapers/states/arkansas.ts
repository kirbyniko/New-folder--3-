import * as cheerio from 'cheerio';
import { BaseScraper, RawEvent, BillInfo } from '../base-scraper';
import { enrichEventMetadata } from '../shared/tagging';

/**
 * Arkansas Legislature Calendar Scraper
 * URL: https://www.arkleg.state.ar.us/Calendars/Meetings?listview=month
 * Method: Static HTML parsing + PDF agenda extraction
 * Features:
 * - Parses month-view calendar with date headers and meeting rows
 * - Extracts agenda PDF URLs
 * - Parses PDFs for bill numbers, tags, virtual meeting links
 * - Detects public participation opportunities (via shared tagging utility)
 */
export class ArkansasScraper extends BaseScraper {
  constructor() {
    super({
      stateCode: 'AR',
      stateName: 'Arkansas',
      websiteUrl: 'https://www.arkleg.state.ar.us',
      reliability: 'high',
      updateFrequency: 24
    });
  }

  getCalendarSources(): { name: string; url: string; description: string }[] {
    return [
      {
        name: 'Arkansas Legislature Calendars',
        url: 'https://www.arkleg.state.ar.us/Calendars',
        description: 'House and Senate committee meeting calendars'
      },
      {
        name: 'Local City Meetings (Legistar API)',
        url: 'https://webapi.legistar.com',
        description: 'Little Rock city council meetings'
      }
    ];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    const baseUrl = 'https://www.arkleg.state.ar.us';
    const calendarUrl = `${baseUrl}/Calendars/Meetings?listview=month`;
    
    console.log('[SCRAPER:Arkansas] 📅 Starting Arkansas calendar scrape');
    console.log(`[SCRAPER:Arkansas] Fetching: ${calendarUrl}`);

    try {
      const response = await fetch(calendarUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      const events: RawEvent[] = [];
      let currentDate: string | null = null;

      // Parse table rows - date headers and meeting rows
      $('.row[data-fixed="true"]').each((_, row) => {
        const $row = $(row);

        // Check if this is a date header
        if ($row.hasClass('tableSectionHeader')) {
          const dateText = $row.find('.col-md-12').text().trim();
          currentDate = dateText; // e.g., "Thursday, December 19, 2025"
          return;
        }

        // Skip if no current date or if this is a row without committee info
        if (!currentDate || !$row.hasClass('tableRow') && !$row.hasClass('tableRowAlt')) {
          return;
        }

        // Parse meeting row
        const timeText = $row.find('.timeRow b').text().trim();
        const $meetingCell = $row.find('.col-md-5').first();
        const committeeLink = $meetingCell.find('a');
        const committeeName = committeeLink.text().trim();
        const committeeUrl = committeeLink.attr('href');
        const location = $meetingCell.find('br').first().next().text().trim();

        if (!committeeName || !timeText) {
          return;
        }

        // Extract agenda PDF link
        const agendaLink = $row.find('a[aria-label="Agenda"]').attr('href');
        const agendaPdfUrl = agendaLink ? `${baseUrl}${agendaLink}` : undefined;

        // Parse date and time
        const parsedDate = this.parseDateTime(currentDate, timeText);
        if (!parsedDate) {
          console.log(`[SCRAPER:Arkansas] ⚠️ Could not parse date: ${currentDate} ${timeText}`);
          return;
        }

        // Generate unique ID
        const id = `ar-${parsedDate.getTime()}-${this.sanitizeForId(committeeName)}`;

        events.push({
          id,
          name: committeeName,
          title: committeeName,
          date: parsedDate.toISOString(),
          time: timeText,
          location: location || 'State Capitol, Little Rock, AR',
          committee: committeeName,
          type: 'committee-meeting',
          level: 'state',
          state: 'AR',
          city: 'Little Rock',
          lat: 34.7465,
          lng: -92.2896,
          zipCode: '72201',
          description: `${committeeName} meeting`,
          sourceUrl: calendarUrl, // Calendar page, not committee detail
          docketUrl: agendaPdfUrl, // PDF agenda URL
          bills: [],
          tags: []
        });
      });

      console.log(`[SCRAPER:Arkansas] ✓ Found ${events.length} events`);

      // Enrich events with PDF agenda data
      let enrichedCount = 0;
      for (const event of events) {
        if (event.docketUrl) {
          const enriched = await this.enrichEventFromPDF(event);
          if (enriched) enrichedCount++;
        }
      }

      console.log(`[SCRAPER:Arkansas] 📋 Enriched ${enrichedCount}/${events.length} events with agenda data`);
      
      return events;

    } catch (error) {
      console.error('[SCRAPER:Arkansas] ❌ Scraping failed:', error);
      return [];
    }
  }

  /**
   * Parse Arkansas date/time format
   * @param dateStr "Thursday, December 19, 2025"
   * @param timeStr "9:00 AM" or "10 Minutes Upon Adjournment of ALC"
   */
  private parseDateTime(dateStr: string, timeStr: string): Date | null {
    try {
      // Handle special time formats
      if (timeStr.includes('Upon Adjournment') || timeStr.includes('upon adjournment')) {
        // Default to 12:00 PM for "upon adjournment" times
        timeStr = '12:00 PM';
      }

      // Parse date: "Thursday, December 19, 2025"
      const dateMatch = dateStr.match(/(\w+),\s+(\w+)\s+(\d{1,2}),\s+(\d{4})/);
      if (!dateMatch) return null;

      const [, , monthName, day, year] = dateMatch;

      const months: Record<string, number> = {
        'January': 0, 'February': 1, 'March': 2, 'April': 3,
        'May': 4, 'June': 5, 'July': 6, 'August': 7,
        'September': 8, 'October': 9, 'November': 10, 'December': 11
      };

      const month = months[monthName];
      if (month === undefined) return null;

      // Parse time: "9:00 AM" or "1:30 PM"
      const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!timeMatch) {
        // Try without minutes: "9 AM"
        const simpleTimeMatch = timeStr.match(/(\d{1,2})\s*(AM|PM)/i);
        if (!simpleTimeMatch) return new Date(parseInt(year), month, parseInt(day), 12, 0);

        let hour = parseInt(simpleTimeMatch[1]);
        const meridiem = simpleTimeMatch[2].toUpperCase();

        if (meridiem === 'PM' && hour !== 12) hour += 12;
        if (meridiem === 'AM' && hour === 12) hour = 0;

        return new Date(parseInt(year), month, parseInt(day), hour, 0);
      }

      let hour = parseInt(timeMatch[1]);
      const minute = parseInt(timeMatch[2]);
      const meridiem = timeMatch[3].toUpperCase();

      if (meridiem === 'PM' && hour !== 12) hour += 12;
      if (meridiem === 'AM' && hour === 12) hour = 0;

      return new Date(parseInt(year), month, parseInt(day), hour, minute);

    } catch (error) {
      console.error('[SCRAPER:Arkansas] Error parsing date/time:', error);
      return null;
    }
  }

  private sanitizeForId(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }

  /**
   * Enrich event with data from PDF agenda
   * Extracts: bills, tags, virtual meeting links, public participation info
   */
  private async enrichEventFromPDF(event: RawEvent): Promise<boolean> {
    if (!event.docketUrl) return false;

    try {
      console.log(`[SCRAPER:Arkansas] 📄 Parsing PDF agenda for ${event.name}`);
      
      // Extract text from PDF
      const pdfText = await this.extractPDFText(event.docketUrl);
      if (!pdfText || pdfText.length < 50) {
        console.log(`[SCRAPER:Arkansas] ⚠️ PDF too short or empty`);
        return false;
      }

      // Step 1: Extract bill numbers
      const billMatches = pdfText.match(/\b([HS]B\s*\d{1,5})\b/gi);
      if (billMatches) {
        const uniqueBills = [...new Set(billMatches.map(b => b.toUpperCase().replace(/\s+/g, ' ')))];
        event.bills = uniqueBills.map(billId => ({
          id: billId,
          title: 'Pending bill analysis',
          url: `https://www.arkleg.state.ar.us/Bills/${billId.replace(/\s+/g, '')}`,
          status: 'On Agenda',
          sponsors: [],
          tags: []
        }));
        console.log(`[SCRAPER:Arkansas] 📋 Found ${uniqueBills.length} bills: ${uniqueBills.join(', ')}`);
      }

      // Step 2: Generate tags and detect public participation using shared utility
      enrichEventMetadata(event, pdfText);
      if (event.tags && event.tags.length > 0) {
        console.log(`[SCRAPER:Arkansas] 🏷️ Tags: ${event.tags.join(', ')}`);
      }
      if (event.allowsPublicParticipation) {
        console.log(`[SCRAPER:Arkansas] 💬 Public participation allowed`);
      }

      // Step 3: Check for virtual meeting links
      const lowerText = pdfText.toLowerCase();
      if (lowerText.includes('zoom') || lowerText.includes('zoom.us')) {
        const zoomMatch = pdfText.match(/https:\/\/[^\s]+zoom\.us[^\s]*/i);
        if (zoomMatch) {
          event.virtualMeetingUrl = zoomMatch[0];
          console.log(`[SCRAPER:Arkansas] 🎥 Zoom link: ${event.virtualMeetingUrl}`);
        }
      } else if (lowerText.includes('teams.microsoft')) {
        const teamsMatch = pdfText.match(/https:\/\/[^\s]+teams\.microsoft\.com[^\s]*/i);
        if (teamsMatch) {
          event.virtualMeetingUrl = teamsMatch[0];
          console.log(`[SCRAPER:Arkansas] 🎥 Teams link: ${event.virtualMeetingUrl}`);
        }
      }

      // Step 4: Public participation is now handled by enrichEventMetadata above

      return true;

    } catch (error) {
      console.error(`[SCRAPER:Arkansas] ❌ Failed to enrich event ${event.name}:`, error);
      return false;
    }
  }

  /**
   * Extract text from PDF using pdfjs-dist
   */
  private async extractPDFText(pdfUrl: string): Promise<string> {
    try {
      // Lazy load pdfjs-dist (Node.js compatibility)
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      
      const response = await fetch(pdfUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        console.error(`[SCRAPER:Arkansas] PDF fetch failed: ${response.status}`);
        return '';
      }

      const arrayBuffer = await response.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      
      const loadingTask = pdfjsLib.getDocument({ data });
      const pdf = await loadingTask.promise;
      
      let fullText = '';
      
      // Extract text from all pages
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }
      
      return fullText;

    } catch (error) {
      console.error(`[SCRAPER:Arkansas] PDF extraction error:`, error);
      return '';
    }
  }
}
