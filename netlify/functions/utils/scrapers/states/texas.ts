import { BaseScraper, ScraperConfig, RawEvent, BillInfo } from '../base-scraper';
import { parseHTML } from '../html-parser';

interface TXMeeting {
  committee: string;
  date: string;
  time: string;
  location: string;
  description: string;
  chamber: 'House' | 'Senate' | 'Joint';
  noticeId?: string;
}

export class TexasScraper extends BaseScraper {
  constructor() {
    const config: ScraperConfig = {
      stateCode: 'TX',
      stateName: 'Texas',
      websiteUrl: 'https://capitol.texas.gov/Committees/MeetingsUpcoming.aspx',
      reliability: 'high',
      updateFrequency: 6,
      maxRequestsPerMinute: 60,
      requestDelay: 250
    };

    super(config);
    this.log('🏛️ TX Scraper initialized');
  }

  getCalendarSources(): { name: string; url: string; description: string }[] {
    return [
      {
        name: 'Texas Legislature Upcoming Meetings',
        url: 'https://capitol.texas.gov/Committees/MeetingsUpcoming.aspx',
        description: 'House and Senate committee meeting schedules'
      },
      {
        name: 'Local City Meetings (Legistar API)',
        url: 'https://webapi.legistar.com',
        description: 'City council meetings from major Texas cities'
      }
    ];
  }

  protected async getPageUrls(): Promise<string[]> {
    return [
      'https://capitol.texas.gov/Committees/MeetingsUpcoming.aspx?Chamber=H',
      'https://capitol.texas.gov/Committees/MeetingsUpcoming.aspx?Chamber=S'
    ];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    try {
      this.log('📅 Starting TX calendar scrape');
      
      const houseEvents = await this.scrapeCommitteeSchedule('House');
      const senateEvents = await this.scrapeCommitteeSchedule('Senate');
      
      const allEvents = [...houseEvents, ...senateEvents];
      
      this.log(`✅ Total TX events scraped: ${allEvents.length}`);
      
      return allEvents;
      
    } catch (error) {
      this.log(`❌ Error scraping TX calendar: ${error}`);
      return [];
    }
  }

  private async scrapeCommitteeSchedule(chamber: 'House' | 'Senate'): Promise<RawEvent[]> {
    try {
      const url = `https://capitol.texas.gov/Committees/MeetingsUpcoming.aspx?Chamber=${chamber === 'House' ? 'H' : 'S'}`;
      this.log(`📥 Fetching ${chamber} schedule from ${url}`);
      
      const html = await this.fetchPage(url);
      const $ = parseHTML(html, `TX ${chamber} Schedule`);
      
      const meetings: TXMeeting[] = [];
      
      $('#tblMeetings tr').each((_, row) => {
        const $row = $(row);
        
        if ($row.find('th').length > 0 || $row.text().includes('No meetings')) {
          return;
        }
        
        const committeeCell = $row.find('td').eq(0);
        const committee = committeeCell.find('a').first().text().trim() || 
                         committeeCell.text().trim();
        
        const dateTimeCell = $row.find('td').eq(1);
        const dateTimeText = dateTimeCell.text().trim();
        
        const locationCell = $row.find('td').eq(2);
        const location = locationCell.text().trim();
        
        const noticeLink = committeeCell.find('a').attr('href');
        const noticeId = noticeLink ? noticeLink.match(/NoticeID=(\d+)/)?.[1] : undefined;
        
        if (committee && dateTimeText) {
          const { date, time } = this.parseDateTimeText(dateTimeText);
          
          meetings.push({
            committee,
            date,
            time,
            location: location || 'Texas State Capitol',
            description: dateTimeText,
            chamber,
            noticeId
          });
        }
      });
      
      this.log(`✅ Parsed ${meetings.length} ${chamber} meetings`);
      
      return await Promise.all(meetings.map(meeting => this.convertTXMeetingToRaw(meeting)));
      
    } catch (error) {
      this.log(`❌ Error scraping TX ${chamber}: ${error}`);
      return [];
    }
  }

  private async convertTXMeetingToRaw(meeting: TXMeeting): Promise<RawEvent> {
    const dateStr = this.parseDate(meeting.date);
    const timeStr = this.parseTime(meeting.time);
    
    const dateTime = new Date(`${dateStr}T${timeStr}:00`);
    
    let bills: BillInfo[] | null = null;
    if (meeting.noticeId) {
      bills = await this.extractBillsFromNotice(meeting.noticeId);
    }
    
    const detailsUrl = meeting.noticeId
      ? `https://capitol.texas.gov/Committees/MeetingDescription.aspx?NoticeID=${meeting.noticeId}`
      : `https://capitol.texas.gov/Committees/MeetingsUpcoming.aspx?Chamber=${meeting.chamber === 'House' ? 'H' : 'S'}`;
    
    return {
      name: meeting.committee,
      date: dateTime.toISOString(),
      time: timeStr,
      location: meeting.location,
      committee: `TX ${meeting.chamber} - ${meeting.committee}`,
      type: 'meeting',
      description: `${meeting.committee} meeting`,
      detailsUrl,
      bills: bills && bills.length > 0 ? bills : null
    };
  }

  private async extractBillsFromNotice(noticeId: string): Promise<BillInfo[]> {
    try {
      const url = `https://capitol.texas.gov/Committees/MeetingDescription.aspx?NoticeID=${noticeId}`;
      this.log(`📄 Fetching notice ${noticeId}`);
      
      const html = await this.fetchPage(url);
      const $ = parseHTML(html, `TX Notice ${noticeId}`);
      
      const bills: BillInfo[] = [];
      
      $('a[href*="BillLookup"]').each((_, elem) => {
        const $link = $(elem);
        const billText = $link.text().trim();
        const billUrl = $link.attr('href');
        
        const billMatch = billText.match(/([HS]B)\s*(\d+)/i);
        if (billMatch && billUrl) {
          const billId = `${billMatch[1].toUpperCase()} ${billMatch[2]}`;
          const fullUrl = billUrl.startsWith('http') 
            ? billUrl 
            : `https://capitol.texas.gov${billUrl}`;
          
          bills.push({
            id: billId,
            title: billId,
            url: fullUrl,
            status: 'Scheduled for Hearing',
            sponsors: []
          });
        }
      });
      
      const uniqueBills = Array.from(
        new Map(bills.map(b => [b.id, b])).values()
      );
      
      for (let i = 0; i < uniqueBills.length; i++) {
        const bill = uniqueBills[i];
        
        try {
          const billHtml = await this.fetchPage(bill.url);
          const summary = this.extractBillSummary(billHtml);
          
          if (summary) {
            bill.title = summary;
            bill.tags = this.generateBillTags(summary);
            this.log(`✅ Got summary for ${bill.id} (${bill.tags?.length || 0} tags)`);
          }
        } catch (error) {
          this.log(`⚠️ Could not fetch summary for ${bill.id}: ${error}`);
        }
        
        if (i < uniqueBills.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 250));
        }
      }
      
      return uniqueBills;
      
    } catch (error) {
      this.log(`❌ Error extracting bills from notice ${noticeId}: ${error}`);
      return [];
    }
  }

  private extractBillSummary(html: string): string | null {
    const $ = parseHTML(html, 'TX Bill Page');
    
    let summary = '';
    
    const captionSection = $('td:contains("Caption:")').next('td');
    if (captionSection.length > 0) {
      summary = captionSection.text().trim();
    }
    
    if (!summary) {
      summary = $('.billCaption, .caption, .bill-description').first().text().trim();
    }
    
    if (summary) {
      summary = summary
        .replace(/\s+/g, ' ')
        .replace(/Caption:\s*/i, '')
        .trim();
      
      if (summary.length > 1000) {
        summary = summary.substring(0, 1000) + '...';
      }
    }
    
    return summary || null;
  }

  private generateBillTags(summary: string): string[] {
    if (!summary) return [];
    
    const tags: Set<string> = new Set();
    const lowerSummary = summary.toLowerCase();
    
    const topicKeywords: Record<string, string[]> = {
      'Healthcare': ['health', 'medical', 'hospital', 'insurance', 'medicaid', 'medicare', 'patient', 'healthcare'],
      'Education': ['education', 'school', 'student', 'teacher', 'university', 'college', 'curriculum'],
      'Environment': ['environment', 'climate', 'pollution', 'conservation', 'natural resource', 'wildlife', 'water quality'],
      'Transportation': ['transportation', 'highway', 'road', 'vehicle', 'traffic', 'infrastructure'],
      'Public Safety': ['police', 'fire', 'emergency', 'safety', 'crime', 'law enforcement', 'security'],
      'Tax': [' tax ', 'taxation', ' tax.', 'tax code', 'property tax', 'sales tax'],
      'Veterans': ['veteran', 'military', 'armed forces', 'service member'],
      'Technology': ['technology', 'digital', 'internet', 'cyber', 'data', 'telecommunications'],
      'Housing': ['housing', 'residential', 'property', 'real estate', 'zoning'],
      'Labor': ['labor', 'employment', 'worker', 'workplace', 'wage', 'employee'],
      'Agriculture': ['agriculture', 'farm', 'farming', 'livestock', 'rural', 'crop'],
      'Criminal Justice': ['criminal', 'prison', 'parole', 'sentencing', 'felony', 'misdemeanor'],
      'Commerce': ['business', 'commerce', 'trade', 'economic', 'industry'],
      'Government Operations': ['government', 'administrative', 'agency', 'department', 'commission'],
      'Consumer Protection': ['consumer', 'protection', 'fraud', 'deceptive'],
      'Civil Rights': ['civil rights', 'discrimination', 'equal', 'accessibility', 'disability']
    };
    
    for (const [tag, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => lowerSummary.includes(keyword))) {
        tags.add(tag);
      }
    }
    
    if (lowerSummary.includes('amending')) tags.add('Amendment');
    if (lowerSummary.includes('relating to') || lowerSummary.includes('providing for')) tags.add('New Program');
    if (lowerSummary.includes('penalty') || lowerSummary.includes('enforcement')) tags.add('Enforcement');
    if (lowerSummary.includes('appropriation') || lowerSummary.includes('funding')) tags.add('Funding');
    if (lowerSummary.includes('regulation') || lowerSummary.includes('licensing')) tags.add('Regulation');
    
    return Array.from(tags).slice(0, 5);
  }

  private parseDateTimeText(text: string): { date: string; time: string } {
    const parts = text.split(/\s+/);
    
    let date = '';
    let time = '09:00';
    
    if (parts[0]) {
      date = parts[0];
    }
    
    for (let i = 1; i < parts.length; i++) {
      if (parts[i].match(/^\d{1,2}:\d{2}$/)) {
        const hour = parseInt(parts[i].split(':')[0]);
        const minute = parts[i].split(':')[1];
        const meridiem = parts[i + 1]?.toLowerCase();
        
        let hours = hour;
        if (meridiem === 'pm' && hour < 12) hours += 12;
        if (meridiem === 'am' && hour === 12) hours = 0;
        
        time = `${hours.toString().padStart(2, '0')}:${minute}`;
        break;
      }
    }
    
    return { date, time };
  }

  private parseDate(dateStr: string): string {
    try {
      if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
        const [month, day, year] = dateStr.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      const dateObj = new Date(dateStr);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toISOString().split('T')[0];
      }
      
      return new Date().toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  }

  private parseTime(timeStr: string): string {
    return timeStr || '09:00';
  }
}
