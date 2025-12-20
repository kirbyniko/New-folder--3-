import { BaseScraper } from '../base-scraper';
import type { RawEvent, ScraperConfig, BillInfo } from '../base-scraper';
import { parseHTML } from '../html-parser';

interface Committee {
  name: string;
  slug: string;
  chamber: 'house' | 'senate';
  meetingsUrl: string;
}

/**
 * Ohio General Assembly Scraper
 * Source: https://www.legislature.ohio.gov/
 * House: https://ohiohouse.gov/
 * Senate: https://ohiosenate.gov/
 * 
 * NOTE: Ohio Legislature operates on a session schedule.
 * Between sessions, committee meetings are typically not scheduled.
 * This scraper fetches recent historical meetings (last 60 days) to show activity.
 */
export class OhioScraper extends BaseScraper {
  private readonly CURRENT_SESSION = '135'; // 135th General Assembly
  private readonly HOUSE_BASE = 'https://ohiohouse.gov';
  private readonly SENATE_BASE = 'https://ohiosenate.gov';
  private readonly DAYS_LOOKBACK = 60; // Only show meetings from last 60 days

  constructor() {
    const config: ScraperConfig = {
      stateCode: 'OH',
      stateName: 'Ohio',
      websiteUrl: 'https://www.legislature.ohio.gov',
      reliability: 'high',
      updateFrequency: 6,
      maxRequestsPerMinute: 20,
      requestDelay: 500
    };
    super(config);
    this.log('🏛️ OH Scraper initialized');
  }

  getCalendarSources(): { name: string; url: string; description: string }[] {
    return [
      {
        name: 'Ohio Legislature',
        url: 'https://www.legislature.ohio.gov',
        description: 'House and Senate committee meeting schedules'
      },
      {
        name: 'Local City Meetings (Legistar API)',
        url: 'https://webapi.legistar.com',
        description: 'City council meetings from major Ohio cities'
      }
    ];
  }

  protected async getPageUrls(): Promise<string[]> {
    return ['https://www.legislature.ohio.gov/committees/house-committees', 
            'https://www.legislature.ohio.gov/committees/senate-committees'];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    this.log('📅 Starting Ohio calendar scrape with bill extraction');
    const allEvents: RawEvent[] = [];

    try {
      // Step 1: Get all committees (House and Senate)
      const committees = await this.fetchCommittees();
      this.log(`📋 Found ${committees.length} committees (House + Senate)`);

      // Step 2: Scrape meetings from each committee
      for (const committee of committees) {
        try {
          await this.delay(this.config.requestDelay || 500);
          const events = await this.scrapeCommitteeMeetings(committee);
          
          if (events.length > 0) {
            this.log(`📅 ${committee.name} (${committee.chamber}): ${events.length} recent meetings`);
            allEvents.push(...events);
          }
        } catch (error) {
          this.log(`⚠️ Failed to scrape ${committee.name}: ${error}`);
        }
      }

      this.log(`✅ Scraped ${allEvents.length} OH events`);
      return allEvents;
    } catch (error) {
      this.log(`❌ Error scraping Ohio: ${error}`);
      throw error;
    }
  }

  /**
   * Fetch all House and Senate committees
   */
  private async fetchCommittees(): Promise<Committee[]> {
    const committees: Committee[] = [];

    // Fetch House committees
    try {
      const houseHtml = await this.fetchPage('https://www.legislature.ohio.gov/committees/house-committees');
      const $house = parseHTML(houseHtml);
      
      $house('a[href*="ohiohouse.gov/committees/"]').each((_, el) => {
        const href = $house(el).attr('href');
        const name = $house(el).text().trim();
        
        if (href && name && !href.includes('/bills') && !href.includes('/video')) {
          const slug = href.split('/committees/')[1]?.split('?')[0] || '';
          if (slug) {
            committees.push({
              name,
              slug,
              chamber: 'house',
              meetingsUrl: `${this.HOUSE_BASE}/committees/${slug}/meetings`
            });
          }
        }
      });

      this.log(`📋 Found ${committees.length} House committees`);
    } catch (error) {
      this.log(`⚠️ Failed to fetch House committees: ${error}`);
    }

    // Fetch Senate committees
    try {
      const senateHtml = await this.fetchPage('https://www.legislature.ohio.gov/committees/senate-committees');
      const $senate = parseHTML(senateHtml);
      
      $senate('a[href*="ohiosenate.gov/committees/"]').each((_, el) => {
        const href = $senate(el).attr('href');
        const name = $senate(el).text().trim();
        
        if (href && name && !href.includes('/legislation') && !href.includes('/video')) {
          const slug = href.split('/committees/')[1]?.split('?')[0] || '';
          if (slug) {
            committees.push({
              name,
              slug,
              chamber: 'senate',
              meetingsUrl: `${this.SENATE_BASE}/committees/${slug}/meetings`
            });
          }
        }
      });

      this.log(`📋 Total: ${committees.length} committees (House + Senate)`);
    } catch (error) {
      this.log(`⚠️ Failed to fetch Senate committees: ${error}`);
    }

    return committees;
  }

  /**
   * Scrape meetings from a committee's meeting page
   */
  private async scrapeCommitteeMeetings(committee: Committee): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.DAYS_LOOKBACK);

    try {
      const html = await this.fetchPage(committee.meetingsUrl);
      const $ = parseHTML(html);

      // Parse meeting table rows
      $('table tr').each((_, row) => {
        const $row = $(row);
        const cells = $row.find('td');
        
        if (cells.length >= 2) {
          const dateTimeText = $(cells[0]).text().trim();
          const billsText = $(cells[1]).text().trim();

          // Parse date/time
          const dateMatch = dateTimeText.match(/(\w+\s+\d{1,2},\s+\d{4})/);
          const timeMatch = dateTimeText.match(/(\d{1,2}:\d{2}\s*[AP]M)/i);
          
          if (dateMatch) {
            const meetingDate = new Date(dateMatch[1]);
            
            // Only include meetings from last DAYS_LOOKBACK days
            if (meetingDate >= cutoffDate) {
              // Extract bills
              const bills = this.extractBills(billsText);

              events.push({
                name: `${committee.name} Committee Meeting`,
                date: meetingDate.toISOString(),
                time: timeMatch ? timeMatch[1] : 'Not specified',
                location: 'Ohio Statehouse',
                committee: `${committee.chamber === 'house' ? 'House' : 'Senate'} ${committee.name}`,
                type: 'hearing',
                bills: bills.length > 0 ? bills : undefined,
                sourceUrl: committee.meetingsUrl
              });
            }
          }
        }
      });
    } catch (error) {
      this.log(`⚠️ Error scraping ${committee.name} meetings: ${error}`);
    }

    return events;
  }

  /**
   * Extract bill numbers from meeting text and enrich with details
   */
  private extractBills(billsText: string): BillInfo[] {
    const bills: BillInfo[] = [];
    
    // Match bill patterns: H. B. No. 148, S. B. No. 232, Am. H. B. No. 96, Sub. S. B. No. 60
    const billPattern = /(?:Am\.\s*|Sub\.\s*)?(H\.|S\.)\s*(?:B\.|C\.\s*R\.)\s*No\.\s*(\d+)/gi;
    const matches = billsText.matchAll(billPattern);

    for (const match of matches) {
      const fullText = match[0]; // e.g., "H. B. No. 148"
      const chamber = match[1]; // "H." or "S."
      const number = match[2]; // "148"

      // Determine bill type
      let billType = '';
      let billId = '';
      
      if (fullText.includes('C. R.')) {
        // Concurrent Resolution
        billType = chamber === 'H.' ? 'HCR' : 'SCR';
        billId = `${billType}${number}`;
      } else {
        // Regular Bill
        billType = chamber === 'H.' ? 'HB' : 'SB';
        billId = `${billType}${number}`;
      }

      const billUrl = `https://www.legislature.ohio.gov/legislation/${this.CURRENT_SESSION}/${billId.toLowerCase()}`;

      bills.push({
        id: billId,
        title: fullText, // Use full text as title initially
        url: billUrl,
        status: 'Scheduled for Committee',
        sponsors: []
      });
    }

    return bills;
  }

  /**
   * Delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
