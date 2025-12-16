import { BaseScraper, ScraperConfig, RawEvent, BillInfo } from '../base-scraper';
import puppeteer from 'puppeteer';

/**
 * New Jersey Legislature Committee API Data Structure
 * 
 * Endpoints:
 * - List committees: /api/legislatorData/committeeInfo/{chamber}
 * - Get schedules: /api/schedules/house/{chamberCode}?committee={committeeCode}
 * 
 * Chamber codes: "S" for Senate, "A" for Assembly
 */

interface NJCommitteeInfo {
  Code_Description: string;
  Comm_Status: string;  // Committee code (e.g., "SBA", "AAP")
  Code_House: string;    // "S" or "A"
  ScheduleCount: number;
  ArchiveCount: number;
}

interface NJSchedule {
  Code_Description: string;
  Agenda_Date: string;           // ISO date
  Agenda_Time_Start: string;     // ISO datetime with timezone
  Agenda_Time_End: string;       // ISO datetime with timezone
  Agenda_Location: string;
  AgendaTime: string;            // Formatted time (e.g., "12:00 PM")
  AgendaComment?: string;        // Contains bill numbers and notes
  Committee_House: string;       // Committee code
  ScheduleStatus: string;        // "upcoming" or "past"
  ScheduleLink?: string;         // Committee page link (e.g., "/committees/assembly-committees?committee=AAP")
  Agenda_Date_Parameter?: string; // Formatted for URL (e.g., "2025-12-18-11:00:00")
}

export class NewJerseyScraper extends BaseScraper {
  constructor() {
    const config: ScraperConfig = {
      stateCode: 'NJ',
      stateName: 'New Jersey',
      websiteUrl: 'https://www.njleg.state.nj.us/',
      reliability: 'high',
      updateFrequency: 12, // Check twice daily
      maxRequestsPerMinute: 60,
      requestDelay: 100 // Reduced from 500ms to 100ms for faster scraping
    };

    super(config);
    this.log('🏛️ NJ Scraper initialized');
  }

  protected async getPageUrls(): Promise<string[]> {
    return [
      'https://www.njleg.state.nj.us/committees/senate-committees',
      'https://www.njleg.state.nj.us/committees/assembly-committees'
    ];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    try {
      this.log('🔍 Starting NJ Legislature API scrape');

      const allEvents: RawEvent[] = [];

      // Scrape Senate committees
      const senateCommittees = await this.fetchCommittees('senate');
      const senateWithMeetings = senateCommittees.filter(c => c.ScheduleCount > 0);
      this.log(`📋 Found ${senateCommittees.length} Senate committees (${senateWithMeetings.length} with meetings)`);
      
      // Batch process Senate committees in parallel (5 at a time to avoid overwhelming API)
      for (let i = 0; i < senateWithMeetings.length; i += 5) {
        const batch = senateWithMeetings.slice(i, i + 5);
        const batchResults = await Promise.all(
          batch.map(committee => this.fetchCommitteeSchedules(committee, 'S'))
        );
        batchResults.forEach(events => allEvents.push(...events));
      }

      // Scrape Assembly committees
      const assemblyCommittees = await this.fetchCommittees('assembly');
      const assemblyWithMeetings = assemblyCommittees.filter(c => c.ScheduleCount > 0);
      this.log(`📋 Found ${assemblyCommittees.length} Assembly committees (${assemblyWithMeetings.length} with meetings)`);
      
      // Batch process Assembly committees in parallel (5 at a time)
      for (let i = 0; i < assemblyWithMeetings.length; i += 5) {
        const batch = assemblyWithMeetings.slice(i, i + 5);
        const batchResults = await Promise.all(
          batch.map(committee => this.fetchCommitteeSchedules(committee, 'A'))
        );
        batchResults.forEach(events => allEvents.push(...events));
      }

      this.log(`✅ Scraped ${allEvents.length} NJ events from ${senateWithMeetings.length + assemblyWithMeetings.length} committees with meetings`);
      return allEvents;

    } catch (error) {
      this.log(`❌ NJ scraper error: ${error}`);
      return [];
    }
  }

  /**
   * Fetch committee list from NJ Legislature API
   */
  private async fetchCommittees(chamber: 'senate' | 'assembly'): Promise<NJCommitteeInfo[]> {
    try {
      const url = `https://www.njleg.state.nj.us/api/legislatorData/committeeInfo/${chamber}`;
      const response = await this.fetchPage(url);
      const data: NJCommitteeInfo[][] = JSON.parse(response);
      
      // API returns array of arrays, flatten it
      return data.flat();
    } catch (error) {
      this.log(`⚠️ Error fetching ${chamber} committees: ${error}`);
      return [];
    }
  }

  /**
   * Fetch committee meeting schedules from NJ Legislature API
   */
  private async fetchCommitteeSchedules(committee: NJCommitteeInfo, chamberCode: 'S' | 'A'): Promise<RawEvent[]> {
    try {
      // Small delay when called in parallel batches
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const url = `https://www.njleg.state.nj.us/api/schedules/house/${chamberCode}?committee=${committee.Comm_Status}`;
      const response = await this.fetchPage(url);
      const data: NJSchedule[][] = JSON.parse(response);
      
      // data[0] = upcoming schedules, data[1] = archive
      const upcomingSchedules = data[0] || [];
      
      // Filter for this specific committee AND future meetings only
      // API returns meetings from all committees, so we must filter by Committee_House
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Start of today
      
      const futureSchedules = upcomingSchedules.filter(schedule => {
        // Must match the requested committee code
        if (schedule.Committee_House !== committee.Comm_Status) {
          return false;
        }
        
        const meetingDate = new Date(schedule.Agenda_Date);
        meetingDate.setHours(0, 0, 0, 0);
        return meetingDate >= now; // Include today and future
      });
      
      this.log(`📋 Found ${futureSchedules.length} upcoming meetings for ${committee.Code_Description}`);
      
      // Convert schedules to RawEvent format (async to fetch bills from meeting pages)
      const events = await Promise.all(
        futureSchedules.map(schedule => this.convertScheduleToEvent(schedule, chamberCode, committee.Comm_Status))
      );
      return events.filter(e => e !== null) as RawEvent[];
      
    } catch (error) {
      this.log(`⚠️ Error fetching schedules for ${committee.Code_Description}: ${error}`);
      return [];
    }
  }

  /**
   * Fetch bills from JavaScript-rendered meeting page using Puppeteer
   */
  private async fetchBillsFromMeetingPage(meetingUrl: string): Promise<BillInfo[]> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      
      // Navigate and wait for content to load
      await page.goto(meetingUrl, { 
        waitUntil: 'networkidle2',
        timeout: 15000 
      });
      
      // Wait for bill links to appear
      await page.waitForSelector('a[href*="/bill-search/"]', { timeout: 10000 });
      
      // Extract bill data from the page
      const billData = await page.evaluate(() => {
        const billLinks = Array.from(document.querySelectorAll('a[href*="/bill-search/"]'));
        const uniqueBills = new Map<string, { id: string; title: string; url: string }>();
        
        billLinks.forEach((link) => {
          const href = (link as HTMLAnchorElement).href;
          const match = href.match(/bill-search\/(\d+)\/([SA]\d+)/);
          
          if (match) {
            const billId = match[2];
            if (!uniqueBills.has(billId)) {
              // Try to get bill description from surrounding text
              const linkText = link.textContent?.trim() || '';
              const parent = link.closest('div, tr, li');
              let description = '';
              
              if (parent) {
                const parentText = parent.textContent || '';
                // Remove the bill ID from description
                description = parentText.replace(linkText, '').trim();
                // Clean up extra whitespace
                description = description.replace(/\s+/g, ' ').substring(0, 150);
              }
              
              uniqueBills.set(billId, {
                id: billId,
                title: description || billId,
                url: href
              });
            }
          }
        });
        
        return Array.from(uniqueBills.values());
      });
      
      // Convert to BillInfo format with tags
      const bills: BillInfo[] = billData.map(bill => {
        const chamber = bill.id.startsWith('S') ? 'Senate' : 'Assembly';
        const billNum = bill.id.substring(1);
        const title = bill.title.length > 10 ? bill.title : `NJ ${bill.id} - ${chamber} Bill ${billNum}`;
        
        // Generate tags based on bill title/description
        const tags = this.generateBillTags(title, chamber);
        
        return {
          id: bill.id,
          title: title,
          url: bill.url,
          status: 'Scheduled for Committee',
          tags: tags
        };
      });
      
      return bills;
      
    } finally {
      await browser.close();
    }
  }

  /**
   * Generate tags for a bill based on its title/description
   */
  private generateBillTags(title: string, chamber: string): string[] {
    const tags: string[] = ['New Jersey', chamber, 'Legislation'];
    const lowerTitle = title.toLowerCase();
    
    // Policy area tags based on keywords in bill title
    if (lowerTitle.match(/\b(tax|revenue|fiscal|budget|appropriation|fund)\b/)) tags.push('Budget', 'Finance', 'Tax');
    if (lowerTitle.match(/\b(health|medical|hospital|medicare|medicaid|insurance)\b/)) tags.push('Healthcare');
    if (lowerTitle.match(/\b(school|education|teacher|student|college|university)\b/)) tags.push('Education');
    if (lowerTitle.match(/\b(transport|road|highway|transit|vehicle|traffic)\b/)) tags.push('Transportation');
    if (lowerTitle.match(/\b(environment|pollution|water|air|climate|energy|conservation)\b/)) tags.push('Environment');
    if (lowerTitle.match(/\b(crime|criminal|prison|sentence|police|law enforcement)\b/)) tags.push('Criminal Justice');
    if (lowerTitle.match(/\b(housing|landlord|tenant|rent|mortgage|property)\b/)) tags.push('Housing');
    if (lowerTitle.match(/\b(labor|employment|worker|wage|union|workplace)\b/)) tags.push('Labor');
    if (lowerTitle.match(/\b(veteran|military|armed forces)\b/)) tags.push('Veterans');
    if (lowerTitle.match(/\b(business|commerce|economic|industry|small business)\b/)) tags.push('Economy', 'Business');
    if (lowerTitle.match(/\b(agriculture|farm|crop|rural)\b/)) tags.push('Agriculture');
    if (lowerTitle.match(/\b(women|gender|equality|discrimination)\b/)) tags.push('Civil Rights', 'Womens Rights');
    if (lowerTitle.match(/\b(child|children|family|parent)\b/)) tags.push('Family', 'Children');
    if (lowerTitle.match(/\b(senior|elderly|aging)\b/)) tags.push('Seniors');
    if (lowerTitle.match(/\b(gun|firearm|weapon|second amendment)\b/)) tags.push('Gun Policy');
    if (lowerTitle.match(/\b(cannabis|marijuana|drug)\b/)) tags.push('Drug Policy');
    if (lowerTitle.match(/\b(gaming|casino|gambling|lottery)\b/)) tags.push('Gaming');
    
    // Remove duplicates
    return [...new Set(tags)];
  }

  /**
   * Generate tags for an event based on committee name
   */
  private generateEventTags(committeeName: string, chamber: string): string[] {
    const tags: string[] = ['New Jersey', chamber, 'Committee Meeting'];
    
    const name = committeeName.toLowerCase();
    
    // Add topic-based tags based on committee name
    if (name.includes('appropriation') || name.includes('budget')) tags.push('Budget', 'Finance');
    if (name.includes('education')) tags.push('Education');
    if (name.includes('health')) tags.push('Healthcare');
    if (name.includes('transportation')) tags.push('Transportation');
    if (name.includes('environment')) tags.push('Environment');
    if (name.includes('judiciary')) tags.push('Criminal Justice', 'Legal');
    if (name.includes('labor')) tags.push('Labor', 'Employment');
    if (name.includes('housing')) tags.push('Housing');
    if (name.includes('agriculture')) tags.push('Agriculture');
    if (name.includes('veteran')) tags.push('Veterans');
    if (name.includes('commerce') || name.includes('economic')) tags.push('Economy', 'Business');
    if (name.includes('women')) tags.push('Womens Rights', 'Civil Rights');
    if (name.includes('tourism') || name.includes('gaming') || name.includes('arts')) tags.push('Tourism', 'Entertainment');
    if (name.includes('community') || name.includes('development')) tags.push('Community Development');
    if (name.includes('children') || name.includes('family')) tags.push('Family', 'Children');
    
    // Remove duplicates
    return [...new Set(tags)];
  }

  /**
   * Convert NJ API schedule data to RawEvent format
   */
  private async convertScheduleToEvent(schedule: NJSchedule, chamberCode: string, committeeCode: string): Promise<RawEvent | null> {
    try {
      const date = new Date(schedule.Agenda_Date);
      const chamber = chamberCode === 'S' ? 'Senate' : 'Assembly';
      
      // Construct meeting detail URL: /live-proceedings/YYYY-MM-DD-HH:MM:SS/COMMITTEE/Meeting
      // Use Agenda_Date_Parameter which is formatted as "2025-12-18-11:00:00"
      let detailsUrl: string | undefined;
      if (schedule.Agenda_Date_Parameter) {
        detailsUrl = `https://www.njleg.state.nj.us/live-proceedings/${schedule.Agenda_Date_Parameter}/${committeeCode}/Meeting`;
      }
      
      // Fetch bills from meeting page using Puppeteer (JavaScript-rendered content)
      let bills: BillInfo[] | undefined = undefined;
      if (detailsUrl) {
        try {
          bills = await this.fetchBillsFromMeetingPage(detailsUrl);
          this.log(`✅ Fetched ${bills.length} bills from meeting page`);
        } catch (error) {
          this.log(`⚠️ Could not fetch bills from meeting page: ${error}`);
          // Fallback to AgendaComment parsing if available
          if (schedule.AgendaComment && schedule.AgendaComment.trim()) {
            bills = this.parseBillsFromComment(schedule.AgendaComment);
          }
        }
      }
      
      // Generate tags from committee name
      const tags = this.generateEventTags(schedule.Code_Description, chamber);
      
      return {
        name: schedule.Code_Description,
        date: date.toISOString(),
        time: schedule.AgendaTime || '12:00 PM',
        location: schedule.Agenda_Location || 'State House Annex, Trenton, NJ',
        committee: `NJ ${chamber} - ${schedule.Code_Description.replace('Senate ', '').replace('Assembly ', '')}`,
        type: 'meeting',
        description: schedule.AgendaComment ? schedule.AgendaComment.substring(0, 200) : undefined,
        detailsUrl: detailsUrl,
        bills: bills && bills.length > 0 ? bills : undefined,
        tags: tags
      };
    } catch (error) {
      this.log(`⚠️ Error converting schedule to event: ${error}`);
      return null;
    }
  }
  
  /**
   * Parse bill numbers from AgendaComment text
   * Example: "*Revised 12/12/25 - S1380, S1888, S2348, S4932, SXXXX, and A4175 (2R) added."
   */
  private parseBillsFromComment(comment: string): BillInfo[] {
    const bills: BillInfo[] = [];
    const uniqueBills = new Set<string>();
    
    // Match bill patterns: S1234, A5678, SB 123, AB 456, etc.
    const billMatches = comment.match(/[SA]\d{1,4}(?!\d)/g);
    
    if (billMatches) {
      for (const billId of billMatches) {
        const normalizedId = billId.trim().toUpperCase();
        if (!uniqueBills.has(normalizedId) && !normalizedId.includes('X')) {
          uniqueBills.add(normalizedId);
          
          // Determine chamber from bill prefix
          const chamber = normalizedId.startsWith('S') ? 'Senate' : 'Assembly';
          const billNum = normalizedId.substring(1);
          
          // Generate tags based on chamber and bill type
          const tags = ['New Jersey', chamber];
          
          bills.push({
            id: normalizedId,
            title: `NJ ${normalizedId} - ${chamber} Bill ${billNum}`,
            url: `https://www.njleg.state.nj.us/bill-search/2024/${normalizedId}`,
            status: 'Scheduled for Committee',
            tags: tags
          });
        }
      }
    }
    
    return bills;
  }
}
