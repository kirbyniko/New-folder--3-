import { BaseScraper } from '../base-scraper';
import type { RawEvent, ScraperConfig, BillInfo } from '../base-scraper';
import { parseHTML } from '../html-parser';

interface MIMeeting {
  committee: string;
  dateStr: string;
  timeStr: string;
  location: string;
  meetingUrl: string;
}

/**
 * Michigan Legislature Scraper with Bill Extraction
 * Source: https://www.legislature.mi.gov/
 * Bills: https://legislature.mi.gov/Bills/Bill?ObjectName={year}-{type}-{number}
 */
export class MichiganScraper extends BaseScraper {
  private readonly BASE_URL = 'https://www.legislature.mi.gov';
  private readonly MEETINGS_URL = `${this.BASE_URL}/Committees/Meetings`;
  
  constructor() {
    const config: ScraperConfig = {
      stateCode: 'MI',
      stateName: 'Michigan',
      websiteUrl: 'https://www.legislature.mi.gov',
      reliability: 'high',
      updateFrequency: 6,
      maxRequestsPerMinute: 60, // Michigan allows reasonable rate
      requestDelay: 250 // 4 requests per second max
    };
    super(config);
    this.log('🏛️ MI Scraper initialized');
  }

  protected async getPageUrls(): Promise<string[]> {
    return [this.MEETINGS_URL];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    this.log('📅 Starting Michigan calendar scrape with bill extraction');
    
    try {
      const html = await this.fetchPage(this.MEETINGS_URL);
      this.log(`✅ Page fetched (${Math.round(html.length / 1024)}KB)`);

      const meetings = this.parseCommitteeSchedule(html);
      this.log(`📋 Found ${meetings.length} meetings`);

      const events: RawEvent[] = [];

      for (const meeting of meetings) {
        try {
          const bills = await this.extractBillsFromMeeting(meeting.meetingUrl);
          
          events.push({
            name: `${meeting.committee} Committee Meeting`,
            date: this.parseDateTimeString(meeting.dateStr, meeting.timeStr),
            time: meeting.timeStr,
            location: meeting.location || 'Michigan State Capitol',
            committee: meeting.committee,
            type: 'hearing',
            detailsUrl: meeting.meetingUrl,
            bills: bills.length > 0 ? bills : undefined,
            sourceUrl: this.config.websiteUrl
          });
          
          if (bills.length > 0) {
            this.log(`✅ ${meeting.committee}: ${bills.length} bills extracted`);
          }
        } catch (error) {
          this.log(`⚠️ Error processing meeting: ${error}`);
          // Still add the event without bills
          events.push({
            name: `${meeting.committee} Committee Meeting`,
            date: this.parseDateTimeString(meeting.dateStr, meeting.timeStr),
            time: meeting.timeStr,
            location: meeting.location || 'Michigan State Capitol',
            committee: meeting.committee,
            type: 'hearing',
            detailsUrl: meeting.meetingUrl,
            sourceUrl: this.config.websiteUrl
          });
        }
      }
      
      this.log(`✅ Scraped ${events.length} MI events with bills`);
      return events;
    } catch (error) {
      this.log(`❌ Error scraping Michigan: ${error}`);
      throw error;
    }
  }

  /**
   * Parse the main committee meetings page
   */
  private parseCommitteeSchedule(html: string): MIMeeting[] {
    const $ = parseHTML(html);
    const meetings: MIMeeting[] = [];
    
    // Michigan lists meetings in <li> elements with links to meeting details
    // Format: <a href="/Committees/Meeting?meetingID=####">Committee Name</a> MM/DD/YYYY HH:MM AM/PM
    $('ul.notATable li').each((_, li) => {
      const $li = $(li);
      const $link = $li.find('a[href*="/Committees/Meeting"]');
      
      if ($link.length > 0) {
        const committee = $link.text().trim();
        const meetingUrl = $link.attr('href');
        const fullText = $li.text();
        
        // Extract date/time: "Committee Name 12/16/2025 09:00 AM"
        const dateTimeMatch = fullText.match(/(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}:\d{2}\s+[AP]M)/i);
        
        if (dateTimeMatch && committee && meetingUrl) {
          meetings.push({
            committee,
            dateStr: dateTimeMatch[1],
            timeStr: dateTimeMatch[2],
            location: 'Michigan State Capitol', // Default location
            meetingUrl: meetingUrl.startsWith('http') ? meetingUrl : `${this.BASE_URL}${meetingUrl}`
          });
        }
      }
    });
    
    return meetings;
  }

  /**
   * Extract bills from a committee meeting detail page
   */
  private async extractBillsFromMeeting(meetingUrl: string): Promise<BillInfo[]> {
    try {
      const html = await this.fetchPage(meetingUrl);
      const $ = parseHTML(html);
      const bills: BillInfo[] = [];
      
      // Michigan has bills in agenda as links: <a href="/Search/ExecuteSearch?docTypes=House Bill&sessions=2025-2026&number=4209">HB 4209</a>
      const agendaDiv = $('.formLeft:contains("Agenda")').next('.formRight');
      
      // Extract bills from links
      const uniqueBills = new Set<string>();
      agendaDiv.find('a[href*="ExecuteSearch"]').each((_, link) => {
        const $link = $(link);
        const billText = $link.text().trim();
        
        // Extract bill ID from text (e.g., "HB 4209")
        const billMatch = billText.match(/([HS]B)\s*(\d+)/i);
        if (billMatch) {
          const billType = billMatch[1].toUpperCase();
          const billNumber = billMatch[2];
          const billId = `${billType} ${billNumber}`;
          
          if (!uniqueBills.has(billId)) {
            uniqueBills.add(billId);
            
            // Get description from text after link (e.g., "(Jenkins-Arno) Economic development...")
            let description = $link.parent().text()
              .replace(billText, '')
              .replace(/\([\w\s-]+\)/g, '') // Remove sponsor names in parens
              .trim();
            
            // Clean up description
            if (description.length > 200) {
              description = description.substring(0, 200) + '...';
            }
            
            bills.push({
              id: billId,
              title: description || 'No description available',
              url: `${this.BASE_URL}/Bills/Bill?ObjectName=2025-${billType}-${billNumber}`,
              tags: [] // Will be populated after
            });
          }
        }
      });
      
      // If no links found, try extracting from plain text as fallback
      if (bills.length === 0) {
        const agendaText = agendaDiv.text();
        const billMatches = agendaText.matchAll(/\b([HS]B)\s*(\d+)/gi);
        
        for (const match of billMatches) {
          const billType = match[1].toUpperCase();
          const billNumber = match[2];
          const billId = `${billType} ${billNumber}`;
          
          if (!uniqueBills.has(billId)) {
            uniqueBills.add(billId);
            bills.push({
              id: billId,
              title: 'Description not available',
              url: `${this.BASE_URL}/Bills/Bill?ObjectName=2025-${billType}-${billNumber}`,
              tags: []
            });
          }
        }
      }
      
      // Generate tags from inline descriptions (skip fetching full summaries to avoid timeout)
      // Michigan provides good descriptions in the agenda already
      for (const bill of bills) {
        bill.tags = this.generateBillTags(bill.title);
        this.log(`📄 ${bill.id}: ${bill.title.substring(0, 60)}... (${bill.tags.length} tags)`);
      }
      
      return bills;
    } catch (error) {
      this.log(`⚠️ Error extracting bills from ${meetingUrl}: ${error}`);
      return [];
    }
  }

  /**
   * Extract bill summary from bill detail page
   */
  private async extractBillSummary(billUrl: string): Promise<string> {
    try {
      const html = await this.fetchPage(billUrl);
      const $ = parseHTML(html);
      
      // Michigan bills have summary in #ObjectSubject div
      const summary = $('#ObjectSubject').text().trim();
      
      if (summary) {
        return summary;
      }
      
      // Fallback: try bill title from h1
      const title = $('h1#BillHeading').text().trim();
      if (title) {
        return title.replace(/^(House|Senate)\s+Bill\s+\d+\s+of\s+\d+/i, '').trim();
      }
      
      return 'No summary available';
    } catch (error) {
      this.log(`⚠️ Error fetching bill summary from ${billUrl}: ${error}`);
      return 'Summary not available';
    }
  }

  /**
   * Generate tags for a bill based on its summary
   */
  private generateBillTags(summary: string): string[] {
    const tags: string[] = [];
    const lowerSummary = summary.toLowerCase();
    
    // Topic-based tags (16 categories - same as PA/TX)
    const topicKeywords: Record<string, string[]> = {
      'Tax': [' tax ', ' tax.', 'tax code', 'taxation', 'revenue'],
      'Healthcare': ['health', 'medical', 'medicare', 'medicaid', 'hospital', 'patient'],
      'Education': ['education', 'school', 'student', 'teacher', 'university', 'college'],
      'Transportation': ['transportation', 'highway', 'road', 'transit', 'vehicle', 'traffic'],
      'Criminal Justice': ['criminal', 'crime', 'prison', 'sentence', 'penalty', 'offense'],
      'Environment': ['environment', 'pollution', 'water', 'air quality', 'conservation', 'wildlife', 'invertebrate', 'species', 'habitat', 'biodiversity'],
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
      if (keywords.some(keyword => lowerSummary.includes(keyword))) {
        tags.push(tag);
      }
    }

    // Action-based tags (5 types)
    if (lowerSummary.includes('amend') || lowerSummary.includes('modify')) {
      tags.push('Amendment');
    }
    if (lowerSummary.includes('repeal') || lowerSummary.includes('eliminate')) {
      tags.push('Repeal');
    }
    if (lowerSummary.includes('new') || lowerSummary.includes('create') || lowerSummary.includes('establish')) {
      tags.push('New Program');
    }
    if (lowerSummary.includes('appropriation') || lowerSummary.includes('funding') || lowerSummary.includes('budget')) {
      tags.push('Appropriation');
    }
    if (lowerSummary.includes('study') || lowerSummary.includes('report') || lowerSummary.includes('committee shall')) {
      tags.push('Study/Report');
    }

    // Limit to 5 most relevant tags
    return tags.slice(0, 5);
  }

  /**
   * Parse date and time into ISO format
   */
  private parseDateTimeString(dateStr: string, timeStr: string): string {
    try {
      // Format: "12/16/2025" and "09:00 AM"
      const [month, day, year] = dateStr.split('/');
      const dateObj = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`);
      
      // Parse time
      const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*([AP]M)/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const meridiem = timeMatch[3].toUpperCase();
        
        if (meridiem === 'PM' && hours !== 12) hours += 12;
        if (meridiem === 'AM' && hours === 12) hours = 0;
        
        dateObj.setHours(hours, minutes, 0, 0);
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
