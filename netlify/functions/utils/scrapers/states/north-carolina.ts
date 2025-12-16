import { BaseScraper } from '../base-scraper';
import type { RawEvent, BillInfo, ScraperConfig } from '../base-scraper';
import { parseHTML } from '../html-parser';

/**
 * North Carolina Legislature Scraper
 * 
 * Data Sources:
 * - Legislative Calendar: https://www.ncleg.gov/LegislativeCalendar
 * - Committee Info: https://www.ncleg.gov/Committees
 * - Bill Lookup: https://www.ncleg.gov/BillLookUp/{billNumber}
 * 
 * Session Schedule:
 * - NC Legislature operates on biennial sessions (odd years start in January)
 * - Short sessions occur in even years (typically May-June)
 * - Special sessions convened as needed
 * - Currently in 2025-2026 biennium
 * 
 * NOTICE: Bill Extraction Limitations
 * - Many NC committee meetings (especially select committees) do not have bills assigned
 * - The scraper returns committee meeting schedules but may not find bills for all meetings
 * - During short sessions and special sessions, select committees often meet without specific legislation
 * - Regular standing committees during full sessions are more likely to have bill agendas
 * 
 * Active Session: December 15-18, 2025 (Short Session)
 */

interface NCCalendarEvent {
  date: Date;
  time: string;
  committee?: string;
  location?: string;
  streamUrl?: string;
  isCommitteeMeeting: boolean;
}

export class NorthCarolinaScraper extends BaseScraper {
  private readonly BASE_URL = 'https://www.ncleg.gov';
  private readonly CURRENT_SESSION = '2025-2026';

  constructor() {
    const config: ScraperConfig = {
      stateCode: 'NC',
      stateName: 'North Carolina',
      websiteUrl: 'https://www.ncleg.gov',
      reliability: 'high',
      updateFrequency: 6,
      requestDelay: 500
    };
    super(config);
  }

  protected async scrapeCalendar(): Promise<RawEvent[]> {
    this.log('🔍 Starting NC Legislature scrape...');
    
    try {
      const calendarEvents = await this.fetchCalendarEvents();
      this.log(`📅 Found ${calendarEvents.length} calendar events`);

      const committeeMeetings = calendarEvents.filter(event => event.isCommitteeMeeting);
      this.log(`🏛️  Filtered to ${committeeMeetings.length} committee meetings`);

      const rawEvents: RawEvent[] = [];
      for (const meeting of committeeMeetings) {
        // Skip bill extraction for now - NC committees often meet without assigned legislation
        // and fetching committee pages times out
        rawEvents.push({
          name: meeting.committee || 'Unknown Committee',
          date: meeting.date.toISOString(),
          time: meeting.time,
          location: meeting.location || 'TBD',
          committee: meeting.committee,
          virtualMeetingUrl: meeting.streamUrl,
          bills: undefined,
          type: 'committee-meeting',
          description: 'No bills currently assigned to this committee meeting'
        });
      }

      this.log(`✅ Scraped ${rawEvents.length} events (${rawEvents.filter(e => e.bills && e.bills.length > 0).length} with bills)`);
      return rawEvents;
    } catch (error) {
      this.logError('NC Legislature scrape failed', error as Error);
      return [];
    }
  }

  private async fetchCalendarEvents(): Promise<NCCalendarEvent[]> {
    try {
      const url = `${this.BASE_URL}/LegislativeCalendar`;
      this.log(`📡 Fetching calendar from ${url}`);
      
      const html = await this.fetchPage(url);
      
      if (!html || html.length === 0) {
        this.logError('No HTML returned from fetchPage', new Error('Empty HTML'));
        return [];
      }
      
      const $ = parseHTML(html);

      const events: NCCalendarEvent[] = [];
      
      // Find all committee meeting links and extract event details
      const committeeLinks = $('a[href*="/Committees/CommitteeInfo/"]');
      
      committeeLinks.each((_, element) => {
        try {
          const $link = $(element);
          const committeeText = $link.text().trim();
          
          // Find parent event row
          const $eventRow = $link.closest('.cal-event');
          if ($eventRow.length === 0) return;
          
          // Find parent day group  
          const $dayGroup = $eventRow.closest('.cal-event-day');
          if ($dayGroup.length === 0) return;
          
          // Extract date
          const $datePill = $dayGroup.find('.date-pill .col-12');
          const dateTexts = $datePill.map((_, el) => $(el).text().trim()).get();
          const datePillText = dateTexts.join(' ');
          
          // Extract time
          const $timeLink = $eventRow.find('a[href*="/Committees/NoticeDocument/"]');
          const timeText = $timeLink.text().trim();
          
          // Extract location
          const $locationLink = $eventRow.find('a[href*="/LegislativeCalendarEvent/"]').first();
          const locationText = $locationLink.text().trim();
          
          // Extract stream URL
          const streamLink = $eventRow.find('a[href*="/LegislativeCalendarEvent/"]').attr('href');
          
          if (committeeText && datePillText) {
            const date = this.parseNCDate(datePillText);
            
            events.push({
              date,
              time: timeText || 'TBD',
              committee: committeeText,
              location: locationText || 'TBD',
              streamUrl: streamLink ? this.resolveUrl(streamLink) : undefined,
              isCommitteeMeeting: true
            });
          }
        } catch (error) {
          // Continue to next link
        }
      });

      if (events.length === 0) {
        this.log('📋 Trying alternative table-based parsing...');
        
        $('table.calendar tr, table.cal-table tr').each((_, row) => {
          try {
            const $row = $(row);
            const cells = $row.find('td');
            
            if (cells.length >= 3) {
              const dateText = $(cells[0]).text().trim();
              const timeText = $(cells[1]).text().trim();
              const titleText = $(cells[2]).text().trim();
              const locationText = cells.length > 3 ? $(cells[3]).text().trim() : '';
              
              const streamLink = $row.find('a[href*="stream"], a[href*="video"]').attr('href');
              
              const isCommitteeMeeting = 
                titleText.toLowerCase().includes('committee') ||
                titleText.toLowerCase().includes('subcommittee');
              
              if (dateText && titleText && isCommitteeMeeting) {
                const date = this.parseNCDate(dateText);
                
                events.push({
                  date,
                  time: timeText || 'TBD',
                  committee: titleText,
                  location: locationText || undefined,
                  streamUrl: streamLink ? this.resolveUrl(streamLink) : undefined,
                  isCommitteeMeeting: true
                });
              }
            }
          } catch (error) {
            this.logError('Error parsing table row', error);
          }
        });
      }

      if (events.length === 0) {
        this.log('🔍 Trying to extract calendar data from page scripts...');
        
        $('script').each((_, script) => {
          const scriptContent = $(script).html() || '';
          
          const jsonMatch = scriptContent.match(/calendarEvents\s*=\s*(\[.*?\]);/s) ||
                           scriptContent.match(/events\s*:\s*(\[.*?\])/s);
          
          if (jsonMatch) {
            try {
              const data = JSON.parse(jsonMatch[1]);
              
              if (Array.isArray(data)) {
                data.forEach((item: any) => {
                  if (item.title && item.date) {
                    const isCommitteeMeeting = 
                      item.title.toLowerCase().includes('committee') ||
                      item.type === 'committee';
                    
                    events.push({
                      date: new Date(item.date),
                      time: item.time || 'TBD',
                      committee: isCommitteeMeeting ? item.title : undefined,
                      location: item.location || undefined,
                      streamUrl: item.streamUrl || undefined,
                      isCommitteeMeeting
                    });
                  }
                });
              }
            } catch (error) {
              // Continue
            }
          }
        });
      }

      // Filter for future events only
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const futureEvents = events.filter(event => event.date >= today);
      this.log(`Returning ${futureEvents.length} future events (${events.length} total found)`);
      return futureEvents;
    } catch (error) {
      this.logError('Failed to fetch calendar events', error as Error);
      return [];
    }
  }

  private async extractBillsFromMeeting(meeting: NCCalendarEvent): Promise<BillInfo[]> {
    try {
      if (meeting.committee) {
        const committeeId = this.extractCommitteeId(meeting.committee);
        if (committeeId) {
          const bills = await this.fetchBillsFromCommitteePage(committeeId);
          if (bills.length > 0) {
            return bills;
          }
        }
      }

      const billNumbers = this.extractBillNumbers(meeting.committee || '');
      if (billNumbers.length > 0) {
        const bills: BillInfo[] = [];
        for (const billNumber of billNumbers) {
          const bill = await this.fetchBillDetails(billNumber);
          if (bill) {
            bills.push(bill);
          }
        }
        return bills;
      }

      return [];
    } catch (error) {
      this.logError(`Failed to extract bills from meeting: ${meeting.committee}`, error);
      return [];
    }
  }

  private async fetchBillsFromCommitteePage(committeeId: string): Promise<BillInfo[]> {
    try {
      const urls = [
        `${this.BASE_URL}/Committees/CommitteeInfo/NonStanding/${committeeId}`,
        `${this.BASE_URL}/Committees/CommitteeInfo/HouseStanding/${committeeId}`,
        `${this.BASE_URL}/Committees/CommitteeInfo/SenateStanding/${committeeId}`,
        `${this.BASE_URL}/Committees/${committeeId}`
      ];

      for (const url of urls) {
        try {
          this.log(`📄 Fetching committee page: ${url}`);
          const html = await this.fetchPage(url);
          const $ = parseHTML(html);

          const billNumbers: string[] = [];
          
          $('a[href*="/BillLookUp/"], a[href*="/Legislation/"]').each((_, link) => {
            const href = $(link).attr('href') || '';
            const billMatch = href.match(/\/(H|S)(\d+)/i);
            if (billMatch) {
              const billNumber = `${billMatch[1].toUpperCase()}${billMatch[2]}`;
              if (!billNumbers.includes(billNumber)) {
                billNumbers.push(billNumber);
              }
            }
          });

          const pageText = $('body').text();
          const textBills = this.extractBillNumbers(pageText);
          textBills.forEach(bill => {
            if (!billNumbers.includes(bill)) {
              billNumbers.push(bill);
            }
          });

          if (billNumbers.length > 0) {
            const bills: BillInfo[] = [];
            for (const billNumber of billNumbers.slice(0, 10)) {
              const bill = await this.fetchBillDetails(billNumber);
              if (bill) {
                bills.push(bill);
              }
            }
            return bills;
          }
        } catch (error) {
          continue;
        }
      }

      return [];
    } catch (error) {
      this.logError(`Failed to fetch committee page: ${committeeId}`, error);
      return [];
    }
  }

  private async fetchBillDetails(billNumber: string): Promise<BillInfo | null> {
    try {
      const formatted = billNumber.replace(/\s+/g, '');
      const url = `${this.BASE_URL}/BillLookUp/${formatted}`;
      
      this.log(`📜 Fetching bill details: ${formatted}`);
      const html = await this.fetchPage(url);
      const $ = parseHTML(html);

      const title = $('.bill-title, .billtitle, h1.title').first().text().trim() ||
                   $('h1').first().text().trim() ||
                   $('meta[property="og:title"]').attr('content') ||
                   'No title available';

      const sponsors: string[] = [];
      $('.sponsor, .bill-sponsor').each((_, elem) => {
        const sponsor = $(elem).text().trim();
        if (sponsor && !sponsors.includes(sponsor)) {
          sponsors.push(sponsor);
        }
      });

      if (sponsors.length === 0) {
        $('a[href*="/Members/"], a[href*="/Legislators/"]').each((_, link) => {
          const sponsor = $(link).text().trim();
          if (sponsor && sponsor.length > 2 && !sponsors.includes(sponsor)) {
            sponsors.push(sponsor);
          }
        });
      }

      const summary = $('.bill-summary, .summary, .bill-description').first().text().trim() ||
                     $('meta[name="description"]').attr('content') ||
                     undefined;

      const tags = this.generateBillTags(title, summary);

      return {
        id: `NC-${formatted}`,
        title: this.cleanText(title),
        url: url,
        sponsors: sponsors.slice(0, 5),
        tags,
        status: summary ? this.cleanText(summary) : undefined
      };
    } catch (error) {
      this.logError(`Failed to fetch bill ${billNumber}`, error);
      return null;
    }
  }

  private generateBillTags(title: string, summary?: string): string[] {
    const content = `${title} ${summary || ''}`.toLowerCase();
    const tags: string[] = [];

    const topicKeywords = {
      'Healthcare': ['health', 'medical', 'medicaid', 'medicare', 'hospital', 'insurance', 'care'],
      'Education': ['school', 'education', 'teacher', 'student', 'university', 'college', 'academic'],
      'Tax': ['tax', 'revenue', 'fiscal', 'budget', 'levy', 'assessment'],
      'Transportation': ['transport', 'highway', 'road', 'vehicle', 'traffic', 'dmv', 'driver'],
      'Environment': ['environment', 'water', 'air quality', 'pollution', 'conservation', 'wildlife'],
      'Criminal Justice': ['crime', 'prison', 'criminal', 'law enforcement', 'police', 'sentence'],
      'Economic Development': ['economic', 'business', 'commerce', 'development', 'industry', 'jobs'],
      'Agriculture': ['farm', 'agriculture', 'crop', 'livestock', 'rural'],
      'Housing': ['housing', 'residential', 'home', 'property', 'landlord', 'tenant'],
      'Election': ['election', 'voting', 'ballot', 'voter', 'campaign'],
      'Energy': ['energy', 'electric', 'utility', 'power', 'renewable'],
      'Labor': ['labor', 'employment', 'worker', 'wage', 'workplace'],
      'Veterans': ['veteran', 'military', 'armed forces'],
      'Technology': ['technology', 'internet', 'data', 'cyber', 'digital'],
      'Public Safety': ['safety', 'emergency', 'fire', 'disaster', 'protection'],
      'Local Government': ['county', 'municipality', 'local government', 'city', 'town']
    };

    for (const [tag, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => {
        const regex = new RegExp(`\\b${keyword}`, 'i');
        return regex.test(content);
      })) {
        tags.push(tag);
      }
    }

    const actionKeywords = {
      'Amendment': ['amend', 'modify', 'revise', 'change', 'alter'],
      'Repeal': ['repeal', 'eliminate', 'remove', 'abolish'],
      'New Program': ['establish', 'create', 'new program', 'initiative'],
      'Funding': ['appropriation', 'fund', 'grant', 'allocate'],
      'Regulation': ['regulate', 'require', 'mandate', 'prohibit', 'restrict']
    };

    for (const [tag, keywords] of Object.entries(actionKeywords)) {
      if (keywords.some(keyword => {
        const regex = new RegExp(`\\b${keyword}`, 'i');
        return regex.test(content);
      })) {
        tags.push(tag);
      }
    }

    return tags.length > 0 ? tags : ['General Legislation'];
  }

  private extractCommitteeId(committeeName: string): string | null {
    const simplified = committeeName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^(house|senate)-/, '');
    
    return simplified || null;
  }

  private extractBillNumbers(text: string): string[] {
    const billNumbers: string[] = [];
    
    const patterns = [
      /\b(H|S)B?\s*(\d+)\b/gi,
      /\bHouse Bill\s+(\d+)\b/gi,
      /\bSenate Bill\s+(\d+)\b/gi
    ];

    patterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        let billNumber: string;
        if (match[2]) {
          billNumber = `${match[1].toUpperCase()}${match[2]}`;
        } else {
          const chamber = text.toLowerCase().includes('house') ? 'H' : 'S';
          billNumber = `${chamber}${match[1]}`;
        }
        
        if (!billNumbers.includes(billNumber)) {
          billNumbers.push(billNumber);
        }
      }
    });

    return billNumbers;
  }

  private parseNCDate(dateStr: string): Date {
    try {
      // Remove day name prefix (e.g., "Wed 12/17" -> "12/17")
      const cleaned = dateStr.replace(/^(MON|TUE|WED|THU|FRI|SAT|SUN)\s+/i, '').trim();
      
      // Try MM/DD format first (most common for NC calendar)
      const mmddMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})$/);
      if (mmddMatch) {
        const month = parseInt(mmddMatch[1], 10);
        const day = parseInt(mmddMatch[2], 10);
        const year = new Date().getFullYear();
        return new Date(year, month - 1, day);
      }

      // Try MM/DD/YY or MM/DD/YYYY format
      const mmddyyMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if (mmddyyMatch) {
        const month = parseInt(mmddyyMatch[1], 10);
        const day = parseInt(mmddyyMatch[2], 10);
        let year = parseInt(mmddyyMatch[3], 10);
        if (year < 100) {
          year += 2000;
        }
        return new Date(year, month - 1, day);
      }

      // Try full date string parsing as fallback
      const parsed = new Date(cleaned);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }

      this.logError(`Could not parse date: ${dateStr}`, new Error('Date parsing failed'));
      return new Date();
    } catch (error) {
      this.logError(`Date parsing error: ${dateStr}`, error as Error);
      return new Date();
    }
  }



  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }
}
