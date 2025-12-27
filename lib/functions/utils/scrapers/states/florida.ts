import { BaseScraper } from '../base-scraper';
import type { RawEvent, ScraperConfig, BillInfo } from '../base-scraper';
import { parseHTML } from '../html-parser';

interface FLCommittee {
  name: string;
  code: string;
  url: string;
}

interface FLMeeting {
  committee: string;
  date: string;
  time: string;
  location: string;
  meetingNoticeUrl?: string;
  expandedAgendaUrl?: string;
}

/**
 * Florida Legislature Scraper
 * Source: https://www.flsenate.gov/
 * Bills: https://www.flsenate.gov/Session/Bill/{year}/{billNumber}
 * 
 * NOTE: Florida Legislature operates on a 60-day session schedule:
 * - 2026 Regular Session starts: January 14, 2026 (2nd Tuesday after 1st Monday)
 * - During interim periods (between sessions), committees typically do not meet
 * - Data availability is limited outside of session dates
 */
export class FloridaScraper extends BaseScraper {
  private readonly BASE_URL = 'https://www.flsenate.gov';
  private readonly COMMITTEES_URL = `${this.BASE_URL}/Committees`;
  private readonly CURRENT_SESSION = '2026';
  private readonly SESSION_START_DATE = new Date('2026-01-14'); // 2026 session begins
  
  constructor() {
    const config: ScraperConfig = {
      stateCode: 'FL',
      stateName: 'Florida',
      websiteUrl: 'https://www.flsenate.gov',
      reliability: 'high',
      updateFrequency: 6,
      maxRequestsPerMinute: 60,
      requestDelay: 250 // 4 requests per second
    };
    super(config);
    this.log('🏛️ FL Scraper initialized');
    
    // Log session status
    const today = new Date();
    if (today < this.SESSION_START_DATE) {
      const daysUntilSession = Math.ceil((this.SESSION_START_DATE.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      this.log(`⏰ FL Legislature in interim. 2026 session starts in ${daysUntilSession} days (Jan 14, 2026)`);
    }
  }

  getCalendarSources(): { name: string; url: string; description: string }[] {
    return [
      {
        name: 'Florida Senate Committees',
        url: 'https://www.flsenate.gov/Committees',
        description: 'Senate and House committee meeting schedules'
      },
      {
        name: 'Local City Meetings (Legistar API)',
        url: 'https://webapi.legistar.com',
        description: 'City council meetings from major Florida cities'
      }
    ];
  }

  protected async getPageUrls(): Promise<string[]> {
    return [this.COMMITTEES_URL];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    this.log('📅 Starting Florida calendar scrape with bill extraction');
    
    // Check if in session period
    const today = new Date();
    if (today < this.SESSION_START_DATE) {
      this.log('⏸️ Florida Legislature not in session - returning empty results');
      return [];
    }
    
    try {
      // Step 1: Get all committees
      const committees = await this.fetchCommittees();
      this.log(`📋 Found ${committees.length} committees`);

      const allEvents: RawEvent[] = [];
      const processedCommittees = new Set<string>(); // Track processed to prevent duplicates

      // Step 2: For each committee, get upcoming meetings
      for (const committee of committees) {
        // Skip if already processed
        if (processedCommittees.has(committee.code)) {
          continue;
        }
        processedCommittees.add(committee.code);

        try {
          await this.delay(this.config.requestDelay || 250);
          const meetings = await this.fetchCommitteeMeetings(committee);
          
          if (meetings.length > 0) {
            this.log(`📅 ${committee.name}: ${meetings.length} meetings`);
          }

          // Step 3: For each meeting, extract bills
          for (const meeting of meetings) {
            try {
              const bills = await this.extractBillsFromMeeting(meeting);
              
              const event: RawEvent = {
                name: `${meeting.committee} Committee Meeting`,
                date: this.parseFloridaDateTime(meeting.date, meeting.time),
                time: meeting.time,
                location: meeting.location || '404 South Monroe Street, Tallahassee, FL',
                committee: meeting.committee,
                type: 'hearing',
                detailsUrl: meeting.meetingNoticeUrl || meeting.expandedAgendaUrl,
                bills: bills.length > 0 ? bills : undefined
              };

              allEvents.push(event);

              if (bills.length > 0) {
                this.log(`✅ ${meeting.committee}: ${bills.length} bills extracted`);
              }
            } catch (error) {
              this.log(`⚠️ Error processing meeting for ${committee.name}: ${error}`);
              // Add event without bills
              allEvents.push({
                name: `${meeting.committee} Committee Meeting`,
                date: this.parseFloridaDateTime(meeting.date, meeting.time),
                time: meeting.time,
                location: meeting.location || '404 South Monroe Street, Tallahassee, FL',
                committee: meeting.committee,
                type: 'hearing',
                detailsUrl: meeting.meetingNoticeUrl || meeting.expandedAgendaUrl
              });
            }
          }
        } catch (error) {
          this.log(`⚠️ Error fetching meetings for ${committee.name}: ${error}`);
        }
      }

      this.log(`✅ Scraped ${allEvents.length} FL events`);
      return allEvents;
    } catch (error) {
      this.log(`❌ Error scraping Florida: ${error}`);
      throw error;
    }
  }

  /**
   * Fetch list of all committees from main committees page
   */
  private async fetchCommittees(): Promise<FLCommittee[]> {
    const html = await this.fetchPage(this.COMMITTEES_URL);
    const $ = parseHTML(html);
    const committees: FLCommittee[] = [];
    const seenCodes = new Set<string>(); // Prevent duplicates

    // Parse standing committees from links like: /Committees/Show/AG/
    $('a[href*="/Committees/Show/"]').each((_, link) => {
      const $link = $(link);
      const href = $link.attr('href');
      const name = $link.text().trim();

      if (href && name && !name.includes('Joint') && !name.includes('Select')) {
        const codeMatch = href.match(/\/Committees\/Show\/([A-Z]+)/);
        if (codeMatch) {
          const code = codeMatch[1];
          
          // Skip if already added
          if (seenCodes.has(code)) {
            return;
          }
          seenCodes.add(code);
          
          committees.push({
            name,
            code,
            url: href.startsWith('http') ? href : `${this.BASE_URL}${href}`
          });
        }
      }
    });

    return committees;
  }

  /**
   * Fetch upcoming meetings for a specific committee
   */
  private async fetchCommitteeMeetings(committee: FLCommittee): Promise<FLMeeting[]> {
    try {
      const html = await this.fetchPage(committee.url);
      const $ = parseHTML(html);
      const meetings: FLMeeting[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Parse meeting table rows
      // Format: | Date | Time | Meeting Notice | Post-Meeting Packet | Attendance | Expanded Agenda | Audio | Video |
      $('table tr').each((_, row) => {
        const $row = $(row);
        const cells = $row.find('td');

        if (cells.length >= 3) {
          const dateText = $(cells[0]).text().trim();
          const timeText = $(cells[1]).text().trim();

          // Skip if "Not meeting" or no date
          if (!dateText || timeText.includes('Not meeting')) {
            return;
          }

          // Parse date (format: "12/9/2025")
          const dateMatch = dateText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
          if (!dateMatch) return;

          const meetingDate = new Date(`${dateMatch[3]}-${dateMatch[1].padStart(2, '0')}-${dateMatch[2].padStart(2, '0')}`);
          
          // Only include future meetings
          if (meetingDate < today) {
            return;
          }

          // Extract meeting notice and expanded agenda URLs
          let meetingNoticeUrl: string | undefined;
          let expandedAgendaUrl: string | undefined;

          $(cells[2]).find('a').each((_, link) => {
            const href = $(link).attr('href');
            if (href) {
              meetingNoticeUrl = href.startsWith('http') ? href : `${this.BASE_URL}${href}`;
            }
          });

          // Expanded agenda is usually in column 5
          if (cells.length > 5) {
            $(cells[5]).find('a').each((_, link) => {
              const href = $(link).attr('href');
              if (href) {
                expandedAgendaUrl = href.startsWith('http') ? href : `${this.BASE_URL}${href}`;
              }
            });
          }

          meetings.push({
            committee: committee.name,
            date: dateText,
            time: timeText,
            location: '404 South Monroe Street, Tallahassee, FL', // Default location
            meetingNoticeUrl,
            expandedAgendaUrl
          });
        }
      });

      return meetings;
    } catch (error) {
      this.log(`⚠️ Error fetching meetings for ${committee.name}: ${error}`);
      return [];
    }
  }

  /**
   * Extract bills from a meeting notice or expanded agenda
   */
  private async extractBillsFromMeeting(meeting: FLMeeting): Promise<BillInfo[]> {
    const bills: BillInfo[] = [];
    
    // Try meeting notice first
    if (meeting.meetingNoticeUrl) {
      try {
        await this.delay(this.config.requestDelay || 250);
        const noticeHtml = await this.fetchPage(meeting.meetingNoticeUrl);
        const noticeBills = this.parseBillsFromNotice(noticeHtml);
        bills.push(...noticeBills);
      } catch (error) {
        this.log(`⚠️ Could not parse meeting notice: ${error}`);
      }
    }

    // Fallback to expanded agenda if no bills found
    if (bills.length === 0 && meeting.expandedAgendaUrl) {
      try {
        await this.delay(this.config.requestDelay || 250);
        const agendaHtml = await this.fetchPage(meeting.expandedAgendaUrl);
        const agendaBills = this.parseBillsFromNotice(agendaHtml);
        bills.push(...agendaBills);
      } catch (error) {
        this.log(`⚠️ Could not parse expanded agenda: ${error}`);
      }
    }

    // Fetch details for each bill from FL API
    const billsWithDetails: BillInfo[] = [];
    for (const bill of bills) {
      try {
        await this.delay(this.config.requestDelay || 250);
        const details = await this.fetchBillDetails(bill.id);
        if (details) {
          billsWithDetails.push(details);
        } else {
          // Keep bill without details
          billsWithDetails.push(bill);
        }
      } catch (error) {
        this.log(`⚠️ Error fetching details for ${bill.id}: ${error}`);
        billsWithDetails.push(bill);
      }
    }

    return billsWithDetails;
  }

  /**
   * Parse bill numbers from meeting notice/agenda HTML
   */
  private parseBillsFromNotice(html: string): BillInfo[] {
    const $ = parseHTML(html);
    const bills: BillInfo[] = [];
    const uniqueBills = new Set<string>();

    // Look for bill links: /Session/Bill/2026/123 or SB 123, HB 456
    $('a[href*="/Session/Bill"]').each((_, link) => {
      const $link = $(link);
      const href = $link.attr('href');
      const text = $link.text().trim();

      if (href) {
        const billMatch = href.match(/\/Session\/Bill\/\d+\/(\d+)/);
        if (billMatch) {
          const billNumber = billMatch[1];
          // Determine if Senate or House bill from context
          const billType = text.includes('HB') || text.includes('H ') ? 'HB' : 'SB';
          const billId = `${billType} ${billNumber}`;

          if (!uniqueBills.has(billId)) {
            uniqueBills.add(billId);
            bills.push({
              id: billId,
              title: text || 'Bill details pending',
              url: href.startsWith('http') ? href : `${this.BASE_URL}${href}`,
              tags: []
            });
          }
        }
      }
    });

    // Also search plain text for bill patterns: SB 1234, HB 5678
    const bodyText = $('body').text();
    const billPattern = /\b([SH]B)\s*(\d+)\b/gi;
    let match;

    while ((match = billPattern.exec(bodyText)) !== null) {
      const billType = match[1].toUpperCase();
      const billNumber = match[2];
      const billId = `${billType} ${billNumber}`;

      if (!uniqueBills.has(billId)) {
        uniqueBills.add(billId);
        bills.push({
          id: billId,
          title: 'Bill details pending',
          url: `${this.BASE_URL}/Session/Bill/${this.CURRENT_SESSION}/${billNumber}`,
          tags: []
        });
      }
    }

    return bills;
  }

  /**
   * Fetch bill details from Florida Senate API
   */
  private async fetchBillDetails(billId: string): Promise<BillInfo | null> {
    try {
      // Extract bill number from ID (e.g., "SB 123" -> "123")
      const numberMatch = billId.match(/\d+/);
      if (!numberMatch) return null;

      const billNumber = numberMatch[0];
      const billUrl = `${this.BASE_URL}/Session/Bill/${this.CURRENT_SESSION}/${billNumber}`;

      const html = await this.fetchPage(billUrl);
      const $ = parseHTML(html);

      // Extract bill title
      let title = $('h1').first().text().trim();
      if (title.includes('|')) {
        title = title.split('|')[1].trim();
      }

      // Extract short description
      let description = $('.billSubTitle').text().trim();
      if (!description) {
        description = $('.billText').first().text().trim().substring(0, 200);
      }

      // Extract sponsor
      const sponsor = $('a[href*="/Senators/"]').first().text().trim();

      // Generate tags from title and description
      const tags = this.generateBillTags(`${title} ${description}`);

      return {
        id: billId,
        title: title || description || 'Bill details pending',
        sponsors: sponsor ? [sponsor] : undefined,
        url: billUrl,
        tags
      };
    } catch (error) {
      this.log(`⚠️ Error fetching bill details for ${billId}: ${error}`);
      return null;
    }
  }

  /**
   * Generate tags for a bill based on title and description
   */
  private generateBillTags(text: string): string[] {
    const tags: string[] = [];
    const lowerText = text.toLowerCase();

    // Topic-based tags (16 categories)
    const topicKeywords: Record<string, string[]> = {
      'Tax': ['\\btax\\b', 'taxation', 'revenue', 'tax code'],
      'Healthcare': ['health', 'medical', 'medicare', 'medicaid', 'hospital', 'patient', 'insurance'],
      'Education': ['education', 'school', 'student', 'teacher', 'university', 'college', 'pre-k'],
      'Transportation': ['transportation', 'highway', 'road', 'transit', 'vehicle', 'traffic'],
      'Criminal Justice': ['criminal', 'crime', 'prison', 'sentence', 'penalty', 'offense', 'law enforcement'],
      'Environment': ['environment', 'pollution', 'water', 'air quality', 'conservation', 'wildlife', 'climate'],
      'Housing': ['housing', 'landlord', 'tenant', 'rent', 'mortgage', 'property'],
      'Labor': ['labor', 'employment', 'worker', 'wage', 'union', 'workplace'],
      'Public Safety': ['police', 'fire', 'emergency', 'safety', 'first responder'],
      'Veterans': ['veteran', 'military', 'armed forces'],
      'Agriculture': ['agriculture', 'farm', 'crop', 'livestock', 'rural'],
      'Energy': ['energy', 'electricity', 'power', 'utility', 'renewable'],
      'Technology': ['technology', 'internet', 'data', 'cyber', 'digital'],
      'Financial Services': ['financial', 'banking', 'insurance', 'securities', 'credit'],
      'Government Operations': ['government', 'state agency', 'administration', 'commission', 'department'],
      'Commerce': ['business', 'commerce', 'trade', 'economic development']
    };

    for (const [tag, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => {
        const regex = new RegExp(keyword, 'i');
        return regex.test(lowerText);
      })) {
        tags.push(tag);
      }
    }

    // Action-based tags (5 types)
    if (/\bamend\b|\bmodify\b/i.test(lowerText)) {
      tags.push('Amendment');
    }
    if (/\brepeal\b|\beliminate\b/i.test(lowerText)) {
      tags.push('Repeal');
    }
    if (/\bnew\b|\bcreate\b|\bestablish\b/i.test(lowerText)) {
      tags.push('New Program');
    }
    if (/\bappropriation\b|\bfunding\b|\bbudget\b/i.test(lowerText)) {
      tags.push('Appropriation');
    }
    if (/\bstudy\b|\breport\b|\bcommittee shall\b/i.test(lowerText)) {
      tags.push('Study/Report');
    }

    // Limit to 5 most relevant tags
    return tags.slice(0, 5);
  }

  /**
   * Parse Florida date and time into ISO format
   */
  private parseFloridaDateTime(dateStr: string, timeStr: string): string {
    try {
      // Format: "12/9/2025" and "10:00 AM"
      const [month, day, year] = dateStr.split('/');
      const dateObj = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`);

      // Parse time if provided
      if (timeStr && timeStr !== 'Not meeting') {
        const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*([AP]M)/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const meridiem = timeMatch[3].toUpperCase();

          if (meridiem === 'PM' && hours !== 12) hours += 12;
          if (meridiem === 'AM' && hours === 12) hours = 0;

          dateObj.setHours(hours, minutes, 0, 0);
        }
      }

      return dateObj.toISOString();
    } catch (error) {
      this.log(`⚠️ Error parsing date/time: ${dateStr} ${timeStr}`);
      return new Date().toISOString();
    }
  }

  /**
   * Delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
