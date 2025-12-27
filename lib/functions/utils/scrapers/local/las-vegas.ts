/**
 * Las Vegas PrimeGov Scraper
 * 
 * Scrapes Las Vegas City Council meetings using PrimeGov portal API.
 * Uses same PrimeGov platform as Oklahoma City.
 * 
 * URL: https://lasvegas.primegov.com/public/portal
 * API: https://lasvegas.primegov.com/api/v2/PublicPortal/ListUpcomingMeetings
 * 
 * Features:
 * - JSON REST API (no Puppeteer needed)
 * - Returns upcoming meetings with agendas
 * - Includes meeting titles, dates, times, and document links
 * - Detects public participation opportunities from API flags
 */

import { RawEvent } from '../base-scraper';
import { enrichEventMetadata } from '../shared/tagging';

interface PrimeGovDocument {
  id: number;
  language: string;
  compileOutputType: number; // 1=PDF, 3=HTML
  publishStatus: number;
  templateId: number;
  meetingId: number;
  sortOrder: number;
  templateSortOrder: number;
  link: string | null;
  templateName: string;
}

interface PrimeGovMeeting {
  id: number;
  meetingTypeId: number;
  committeeId: number;
  dateTime: string; // ISO format: "2025-12-17T09:00:00"
  date: string; // Formatted: "Dec 17, 2025"
  time: string; // Formatted: "09:00 AM"
  documentList: PrimeGovDocument[];
  allowPublicSpeaker: boolean;
  allowPublicComment: boolean;
  isZoomMeeting: boolean;
  videoUrl: string | null;
  swagitId: string | null;
  isShowVideoIcon: boolean;
  isMediaManagerVideo: boolean;
  externalProviderMeetingId: string | null;
  zoomMeetingLink: string | null;
  meetingOnline: boolean;
  streamCompleted: boolean;
  meetingState: number;
  title: string;
}

/**
 * Scrape Las Vegas City Council meetings from PrimeGov API
 */
export async function scrapeLasVegasMeetings(): Promise<RawEvent[]> {
  const url = 'https://lasvegas.primegov.com/api/v2/PublicPortal/ListUpcomingMeetings';
  
  console.log('[SCRAPER:LASVEGAS] Fetching from PrimeGov API...');
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    });
    
    if (!response.ok) {
      console.error(`[SCRAPER:LASVEGAS] API returned ${response.status}`);
      return [];
    }
    
    const meetings: PrimeGovMeeting[] = await response.json();
    console.log(`[SCRAPER:LASVEGAS] Found ${meetings.length} upcoming meetings`);
    
    // Filter out cancelled meetings
    const filteredMeetings = meetings.filter(meeting => {
      // Check for cancellation in document names
      const isCancelled = meeting.documentList.some(doc => 
        doc.templateName.toLowerCase().includes('cancellation')
      );
      // Check for cancellation in title
      const titleCancelled = meeting.title.toLowerCase().includes('cancel');
      return !isCancelled && !titleCancelled;
    });
    
    // Convert meetings to events
    const events: RawEvent[] = filteredMeetings.map(meeting => convertToRawEvent(meeting));
    
    console.log(`[SCRAPER:LASVEGAS] Returning ${events.length} events after filtering`);
    return events;
  } catch (error) {
    console.error('[SCRAPER:LASVEGAS] Error:', error);
    return [];
  }
}

/**
 * Convert PrimeGov meeting to RawEvent format
 */
function convertToRawEvent(meeting: PrimeGovMeeting): RawEvent {
  // Find agenda document (PDF or HTML)
  const agendaDoc = meeting.documentList.find(doc => 
    doc.templateName.toLowerCase().includes('agenda') &&
    !doc.templateName.toLowerCase().includes('cancellation')
  );
  
  // Build document URLs
  let docketUrl: string | undefined = undefined;
  let meetingUrl: string | undefined = undefined;
  
  if (agendaDoc) {
    // Meeting detail page URL (always available if there's a document)
    meetingUrl = `https://lasvegas.primegov.com/Portal/Meeting?meetingTemplateId=${agendaDoc.templateId}`;
    
    // Docket URL (PDF or HTML agenda)
    if (agendaDoc.link) {
      docketUrl = agendaDoc.link;
    } else if (agendaDoc.compileOutputType === 1) {
      // PDF document
      docketUrl = `https://lasvegas.primegov.com/Public/CompiledDocument?meetingTemplateId=${agendaDoc.templateId}&compileOutputType=1`;
    } else if (agendaDoc.compileOutputType === 3) {
      // HTML document
      docketUrl = meetingUrl;
    }
  }
  
  // Use the specific meeting page as source, fallback to portal
  const sourceUrl = meetingUrl || `https://lasvegas.primegov.com/public/portal`;
  
  // Parse date/time to ISO format
  const meetingDate = new Date(meeting.dateTime);
  const isoDate = meetingDate.toISOString();
  
  // Generate unique ID from meeting template ID or timestamp + title
  const idBase = agendaDoc?.templateId || meetingDate.getTime();
  const titleSlug = meeting.title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50);
  const id = `lasvegas-${idBase}-${titleSlug}`;
  
  const event: RawEvent = {
    id,
    title: meeting.title,
    name: meeting.title,
    date: isoDate,
    time: meeting.time,
    location: 'City Hall, 495 S. Main St., Las Vegas, NV 89101',
    level: 'local',
    description: meeting.title,
    committee: meeting.title,
    state: 'NV',
    city: 'Las Vegas',
    sourceUrl,
    docketUrl,
    allowsPublicParticipation: meeting.allowPublicSpeaker || meeting.allowPublicComment
  };
  
  // Apply shared tagging
  enrichEventMetadata(event);
  
  return event;
}
