/**
 * Connecticut General Assembly Scraper
 * 
 * Scrapes committee meetings from the Connecticut legislature mobile events page.
 * Uses static HTML parsing - no Puppeteer needed.
 * 
 * URL: https://www.cga.ct.gov/webapps/cgaevents.asp
 * Method: Simple HTML table parsing with Cheerio
 * Data: Events include date, time, committee name, location, and agenda PDFs
 */

import { BaseScraper, RawEvent } from '../base-scraper';
import * as cheerio from 'cheerio';

export class ConnecticutScraper extends BaseScraper {
  constructor() {
    super({
      stateCode: 'CT',
      stateName: 'Connecticut',
      websiteUrl: 'https://www.cga.ct.gov',
      reliability: 'high',
      updateFrequency: 24
    });
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    this.log('📅 Starting Connecticut calendar scrape');
    
    // Calculate date range (today + 30 days)
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + 30);
    
    const startStr = this.formatDate(today);
    const endStr = this.formatDate(endDate);
    
    const url = `https://www.cga.ct.gov/webapps/cgaevents.asp?Start=${startStr}&End=${endStr}`;
    
    this.log(`📡 Fetching: ${url}`);
    
    try {
      const html = await this.fetchPage(url);
      const $ = cheerio.load(html);
      
      const events: RawEvent[] = [];
      
      // Find all table rows (skip header row)
      $('table tr').each((index, row) => {
        // Skip first two rows (they're usually headers or empty)
        if (index < 2) return;
        
        const cells = $(row).find('td');
        if (cells.length < 4) return; // Need at least 4 columns
        
        try {
          // Extract data from cells
          const dateStr = $(cells[0]).text().trim(); // "12/17/2025"
          const timeStr = $(cells[1]).text().trim().replace(/&nbsp;/g, ' '); // "10:00 AM"
          const nameCell = $(cells[2]);
          const locationStr = $(cells[3]).text().trim().replace(/&nbsp;/g, ' ');
          
          // Get event name and optional agenda URL
          const linkElem = nameCell.find('a[href*="/pdf/"]');
          let name = '';
          let agendaUrl: string | undefined = undefined;
          
          if (linkElem.length > 0) {
            // Has agenda PDF link
            name = linkElem.text().trim().replace(/\s+/g, ' ');
            const pdfPath = linkElem.attr('href');
            if (pdfPath) {
              agendaUrl = pdfPath.startsWith('http') 
                ? pdfPath 
                : `https://www.cga.ct.gov${pdfPath}`;
            }
          } else {
            // No link, just text
            name = nameCell.text().trim().replace(/\s+/g, ' ');
          }
          
          // Skip if no name or marked as CANCELLED
          if (!name || name.startsWith('CANCELLED:')) {
            return;
          }
          
          // Parse date and time
          const dateTimeParsed = this.parseDateTime(dateStr, timeStr);
          if (!dateTimeParsed) {
            this.log(`⚠️ Could not parse date/time: ${dateStr} ${timeStr}`);
            return;
          }
          
          // Generate unique ID
          const id = `ct-${dateTimeParsed.timestamp}-${this.sanitizeForId(name)}`;
          
          const event: RawEvent = {
            id,
            name,
            date: dateTimeParsed.isoDate,
            time: timeStr || 'Time TBD',
            location: locationStr || 'Location TBD',
            committee: this.extractCommitteeName(name),
            type: 'committee-meeting',
            sourceUrl: url,
            docketUrl: agendaUrl, // Direct link to agenda PDF if available
            description: agendaUrl ? `Agenda: ${agendaUrl}` : undefined,
            bills: []
          };
          
          events.push(event);
        } catch (error) {
          this.log(`⚠️ Error parsing row: ${error}`);
        }
      });
      
      this.log(`✅ Found ${events.length} Connecticut events`);
      return events;
      
    } catch (error) {
      this.logError('Failed to scrape Connecticut', error);
      throw error;
    }
  }

  /**
   * Format date as MM/DD/YYYY for CT website
   */
  private formatDate(date: Date): string {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  }

  /**
   * Parse Connecticut date/time format
   * Date: "12/17/2025"
   * Time: "10:00 AM" or "10:00 PM"
   */
  private parseDateTime(dateStr: string, timeStr: string): { isoDate: string; timestamp: number } | null {
    try {
      // Parse date: MM/DD/YYYY
      const dateParts = dateStr.split('/');
      if (dateParts.length !== 3) return null;
      
      const month = parseInt(dateParts[0], 10);
      const day = parseInt(dateParts[1], 10);
      const year = parseInt(dateParts[2], 10);
      
      // Parse time: "10:00 AM" or "2:30 PM"
      let hours = 0;
      let minutes = 0;
      
      if (timeStr && timeStr !== 'Time TBD') {
        const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (timeMatch) {
          hours = parseInt(timeMatch[1], 10);
          minutes = parseInt(timeMatch[2], 10);
          const meridiem = timeMatch[3].toUpperCase();
          
          // Convert to 24-hour format
          if (meridiem === 'PM' && hours !== 12) {
            hours += 12;
          } else if (meridiem === 'AM' && hours === 12) {
            hours = 0;
          }
        }
      }
      
      // Create Date object (Connecticut is EST/EDT - UTC-5/-4)
      const date = new Date(year, month - 1, day, hours, minutes);
      
      return {
        isoDate: date.toISOString(),
        timestamp: date.getTime()
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract committee name from event title
   * Examples:
   * - "Social Equity Council: Meeting" → "Social Equity Council"
   * - "Sewage Disposal Working Group - Nitrogen & Environment" → "Sewage Disposal Working Group"
   * - "Task Force on the Regulation of Corporate Housing Acquisitions" → "Task Force"
   */
  private extractCommitteeName(title: string): string {
    // Try to extract before colon or dash
    const colonMatch = title.match(/^([^:]+):/);
    if (colonMatch) {
      return colonMatch[1].trim();
    }
    
    const dashMatch = title.match(/^([^-]+)-/);
    if (dashMatch) {
      return dashMatch[1].trim();
    }
    
    // For "Task Force on..." or "Committee on...", use first part
    const taskForceMatch = title.match(/^(Task Force|Committee|Council|Commission|Working Group|Board)/i);
    if (taskForceMatch) {
      return taskForceMatch[1];
    }
    
    // Otherwise use full title (truncated to 50 chars)
    return title.substring(0, 50);
  }

  /**
   * Sanitize string for use in ID
   */
  private sanitizeForId(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 30);
  }
}
