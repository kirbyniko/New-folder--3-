import { BaseScraper } from '../base-scraper';
import type { RawEvent, ScraperConfig } from '../base-scraper';

interface DelawareAPIResponse {
  Data: DelawareCommitteeMeeting[];
  Total: number;
}

interface DelawareCommitteeMeeting {
  CommitteeMeetingId: number;
  CommitteeId: number;
  MeetingLocationAddressId: number | null;
  MeetingDateTime: string; // "1/15/26 11:00 AM"
  MeetingEndDateTime: string;
  CommitteeMeetingStatusId: number;
  CommitteeMeetingStatusName: string;
  CommitteeName: string;
  CommitteeShortName: string | null;
  CommitteeDescription: string | null;
  CommitteeTypeId: number;
  CommitteeTypeShortCode: string; // "J", "H", "S"
  CommitteeTypeName: string; // "Joint", "House", "Senate"
  AssemblyId: number;
  AddressAliasNickname: string | null;
  RoomNumber: string | null;
  AgendaComments: string | null;
  HasCommitteeMeetingItem: boolean;
  IsVirtualMeeting: boolean;
  VirtualMeetingLink: string | null;
  PublicVirtualMeetingLink: string | null;
  MeetingTopic: string | null;
  SharedWithCommitteeId: number | null;
  SharedCommitteeName: string | null;
  SharedCommitteeTypeShortCode: string | null;
}

/**
 * Delaware State Legislature Scraper
 * Source: https://legis.delaware.gov/CommitteeMeetings
 * 
 * Delaware's General Assembly system:
 * - JSON API for upcoming committee meetings
 * - House, Senate, and Joint committees
 * - Virtual meeting support
 * - Real-time meeting updates
 */
export class DelawareScraper extends BaseScraper {
  private readonly apiUrl = 'https://legis.delaware.gov/json/CommitteeMeetings/GetUpcomingCommitteeMeetings';
  private readonly baseUrl = 'https://legis.delaware.gov';
  private readonly capitol = { lat: 39.1582, lng: -75.5244 }; // Dover coordinates

  constructor() {
    const config: ScraperConfig = {
      stateCode: 'DE',
      stateName: 'Delaware',
      websiteUrl: 'https://legis.delaware.gov/CommitteeMeetings',
      reliability: 'high',
      updateFrequency: 6,
      maxRequestsPerMinute: 30
    };
    super(config);
  }

  getCalendarSources(): { name: string; url: string; description: string }[] {
    return [
      {
        name: 'Delaware General Assembly Committee Meetings',
        url: 'https://legis.delaware.gov/CommitteeMeetings',
        description: 'House, Senate, and Joint committee meeting schedules'
      },
      {
        name: 'Local City Meetings (Legistar API)',
        url: 'https://webapi.legistar.com',
        description: 'City council meetings from Wilmington and other Delaware municipalities'
      }
    ];
  }

  protected async scrapeCalendar(): Promise<RawEvent[]> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Delaware API returned ${response.status}`);
      }

      const data: DelawareAPIResponse = await response.json();
      
      if (!data.Data || data.Data.length === 0) {
        return [];
      }

      const events: RawEvent[] = [];

      for (const meeting of data.Data) {
        // Skip cancelled meetings
        if (meeting.CommitteeMeetingStatusId === 2) {
          continue;
        }

        // Parse date and time
        const date = this.parseDateTime(meeting.MeetingDateTime);
        if (!date) {
          console.warn(`Delaware: Could not parse date "${meeting.MeetingDateTime}"`);
          continue;
        }

        // Build committee name with chamber
        let committeeName = meeting.CommitteeName;
        if (meeting.SharedWithCommitteeId) {
          // Joint meeting
          committeeName = `${meeting.CommitteeName} (${meeting.CommitteeTypeShortCode}) & ${meeting.SharedCommitteeName} (${meeting.SharedCommitteeTypeShortCode})`;
        } else if (meeting.CommitteeTypeName !== 'Joint') {
          committeeName = `${meeting.CommitteeTypeName} ${meeting.CommitteeName}`;
        }

        // Build location string
        let location = meeting.AddressAliasNickname || 'Legislative Hall';
        if (meeting.IsVirtualMeeting) {
          location = 'Virtual Meeting';
        }

        // Build description from agenda comments
        let description = '';
        if (meeting.AgendaComments) {
          // Strip HTML tags for description
          description = meeting.AgendaComments
            .replace(/<[^>]*>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 500);
        }

        // Meeting notice URL
        const docketUrl = `${this.baseUrl}/MeetingNotice?committeeMeetingId=${meeting.CommitteeMeetingId}`;

        // Create event
        const event: RawEvent = {
          name: meeting.MeetingTopic || committeeName,
          date,
          time: this.formatTime(meeting.MeetingDateTime),
          location,
          committee: committeeName,
          type: 'committee-meeting',
          description,
          sourceUrl: `${this.baseUrl}/CommitteeMeetings`,
          docketUrl,
          virtualMeetingUrl: meeting.PublicVirtualMeetingLink || undefined
        };

        events.push(event);
      }

      return events;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Parse Delaware's date format: "1/15/26 11:00 AM"
   */
  private parseDateTime(dateStr: string): Date | null {
    try {
      const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2})\s+(\d{1,2}):(\d{2})\s+(AM|PM)/i);
      if (!match) return null;

      const [, month, day, year, hour, minute, ampm] = match;
      
      // Convert 2-digit year to 4-digit (26 -> 2026)
      const fullYear = 2000 + parseInt(year);
      
      // Convert 12-hour to 24-hour
      let hour24 = parseInt(hour);
      if (ampm.toUpperCase() === 'PM' && hour24 !== 12) {
        hour24 += 12;
      } else if (ampm.toUpperCase() === 'AM' && hour24 === 12) {
        hour24 = 0;
      }

      const date = new Date(fullYear, parseInt(month) - 1, parseInt(day), hour24, parseInt(minute));
      
      return isNaN(date.getTime()) ? null : date;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract time string from datetime: "1/15/26 11:00 AM" -> "11:00 AM"
   */
  private formatTime(dateStr: string): string {
    const match = dateStr.match(/(\d{1,2}:\d{2}\s+(?:AM|PM))/i);
    return match ? match[1] : '';
  }

  /**
   * Override transform to set capitol coordinates
   */
  protected override async transformEvent(raw: RawEvent) {
    const event = await super.transformEvent(raw);
    if (event) {
      event.lat = this.capitol.lat;
      event.lng = this.capitol.lng;
      event.city = 'Dover';
    }
    return event;
  }
}
