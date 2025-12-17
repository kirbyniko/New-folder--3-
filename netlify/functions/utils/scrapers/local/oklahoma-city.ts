/**
 * Oklahoma City PrimeGov Scraper
 * 
 * Scrapes Oklahoma City government meetings using PrimeGov portal API.
 * PrimeGov is similar to Legistar but with different API structure.
 * 
 * URL: https://okc.primegov.com/public/portal
 * API: https://okc.primegov.com/api/v2/PublicPortal/ListUpcomingMeetings
 * 
 * Features:
 * - JSON REST API (no Puppeteer needed)
 * - Returns upcoming meetings with agendas
 * - Includes meeting titles, dates, times, and document links
 * - Parses PDF agendas for agenda items and topics
 */

import type { RawEvent } from '../../base-scraper';

// Lazy load pdfjs-dist to avoid Node.js compatibility issues
let pdfjsLib: any = null;

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
 * Scrape Oklahoma City meetings from PrimeGov API
 */
export async function scrapeOklahomaCityMeetings(): Promise<RawEvent[]> {
  const url = 'https://okc.primegov.com/api/v2/PublicPortal/ListUpcomingMeetings';
  
  console.log('[SCRAPER:OKC] Fetching from PrimeGov API...');
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    });
    
    if (!response.ok) {
      console.error(`[SCRAPER:OKC] API returned ${response.status}`);
      return [];
    }
    
    const meetings: PrimeGovMeeting[] = await response.json();
    console.log(`[SCRAPER:OKC] Found ${meetings.length} upcoming meetings`);
    
    // Filter out cancelled meetings and convert to RawEvent format
    const filteredMeetings = meetings.filter(meeting => {
      // meetingState: 1=upcoming, 3=published/confirmed
      // Skip cancelled meetings (check for "cancellation" in document names)
      const isCancelled = meeting.documentList.some(doc => 
        doc.templateName.toLowerCase().includes('cancellation')
      );
      return !isCancelled;
    });
    
    // Convert meetings to events with PDF parsing
    const events: RawEvent[] = [];
    for (const meeting of filteredMeetings) {
      const event = await convertToRawEvent(meeting);
      events.push(event);
    }
    
    console.log(`[SCRAPER:OKC] Returning ${events.length} events after filtering`);
    return events;
    
  } catch (error) {
    console.error('[SCRAPER:OKC] Error scraping:', error);
    return [];
  }
}

/**
 * Convert PrimeGov meeting to RawEvent format (async to support PDF parsing)
 */
async function convertToRawEvent(meeting: PrimeGovMeeting): Promise<RawEvent> {
  // Parse ISO date to get proper Date object
  const eventDate = new Date(meeting.dateTime);
  
  // Generate unique ID
  const titleSlug = meeting.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const id = `oklahomacity-${meeting.id}-${titleSlug}`;
  
  // Build sourceUrl to the meeting detail page
  const sourceUrl = `https://okc.primegov.com/public/portal`;
  
  // Find PDF agenda document
  const pdfAgendaDoc = meeting.documentList.find(doc => 
    doc.compileOutputType === 1 && doc.templateName.toLowerCase().includes('agenda')
  );
  
  // Parse PDF agenda if available
  let agendaItems: string[] = [];
  let docketUrl: string | undefined = undefined;
  
  if (pdfAgendaDoc) {
    const pdfUrl = getDocumentUrl(pdfAgendaDoc);
    docketUrl = pdfUrl; // Set the PDF agenda as the docket URL
    console.log(`[SCRAPER:OKC] Parsing PDF agenda for ${meeting.title}...`);
    agendaItems = await extractAgendaItemsFromPDF(pdfUrl);
  }
  
  // Build description with document links and agenda items
  let description = '';
  
  // Add direct PDF links first
  const pdfDocs = meeting.documentList.filter(doc => doc.compileOutputType === 1);
  if (pdfDocs.length > 0) {
    const pdfLinks = pdfDocs
      .map(doc => `${doc.templateName}: ${getDocumentUrl(doc)}`)
      .join('; ');
    description = `Documents: ${pdfLinks}`;
  }
  
  // Add agenda items summary if found
  if (agendaItems.length > 0) {
    const itemsSummary = agendaItems.slice(0, 3).join('; ');
    const moreText = agendaItems.length > 3 ? ` (+ ${agendaItems.length - 3} more items)` : '';
    description += (description ? ' | ' : '') + `Agenda: ${itemsSummary}${moreText}`;
  }
  
  // Add virtual meeting info if available
  if (meeting.videoUrl) {
    description += (description ? ' | ' : '') + `Video: ${meeting.videoUrl}`;
  }
  
  const event: RawEvent = {
    id,
    name: meeting.title.trim(),
    date: eventDate.toISOString(),
    time: meeting.time,
    location: 'Oklahoma City Hall', // PrimeGov doesn't provide location in API
    committee: meeting.title.trim(),
    type: 'meeting',
    sourceUrl,
    docketUrl, // Direct link to PDF agenda
    virtualMeetingUrl: meeting.videoUrl || meeting.zoomMeetingLink || undefined,
    description: description || undefined,
    bills: []
  };
  
  return event;
}

/**
 * Extract agenda items from PDF using pdfjs-dist
 */
async function extractAgendaItemsFromPDF(pdfUrl: string): Promise<string[]> {
  try {
    // Lazy load pdfjs-dist only when needed
    if (!pdfjsLib) {
      pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    }
    
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      console.error(`[SCRAPER:OKC] Failed to fetch PDF: ${response.status}`);
      return [];
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    // Only parse first 3 pages to avoid timeout
    const maxPages = Math.min(pdf.numPages, 3);
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    // Extract agenda items (look for various patterns)
    const items: string[] = [];
    const seenItems = new Set<string>();
    
    // Pattern 1: Lines starting with numbers or letters followed by period
    const lines = fullText.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip header lines
      if (line.match(/^(CALL TO ORDER|ROLL CALL|ADJOURNMENT|APPROVAL OF|PLEDGE OF ALLEGIANCE)/i)) {
        continue;
      }
      
      // Look for numbered items: "1.", "2.", etc.
      const numberMatch = line.match(/^(\d{1,2})\.\s+(.+)/);
      if (numberMatch && numberMatch[2]) {
        let item = numberMatch[2].trim().replace(/\s+/g, ' ');
        // Sometimes items continue on next line
        if (i + 1 < lines.length && !lines[i + 1].match(/^\d{1,2}\./)) {
          item += ' ' + lines[i + 1].trim();
        }
        if (item.length >= 15 && item.length <= 150 && !seenItems.has(item)) {
          items.push(item.substring(0, 120));
          seenItems.add(item);
        }
      }
      
      // Look for letter items: "A.", "B.", etc.
      const letterMatch = line.match(/^([A-Z])\.\s+(.+)/);
      if (letterMatch && letterMatch[2]) {
        let item = letterMatch[2].trim().replace(/\s+/g, ' ');
        if (i + 1 < lines.length && !lines[i + 1].match(/^[A-Z]\./)) {
          item += ' ' + lines[i + 1].trim();
        }
        if (item.length >= 15 && item.length <= 150 && !seenItems.has(item)) {
          items.push(item.substring(0, 120));
          seenItems.add(item);
        }
      }
      
      // Look for Roman numerals: "I.", "II.", etc.
      const romanMatch = line.match(/^([IVX]{1,5})\.\s+(.+)/i);
      if (romanMatch && romanMatch[2]) {
        let item = romanMatch[2].trim().replace(/\s+/g, ' ');
        if (item.length >= 15 && item.length <= 150 && !seenItems.has(item)) {
          items.push(item.substring(0, 120));
          seenItems.add(item);
        }
      }
    }
    
    // Pattern 2: Look for "Item" or "Resolution" keywords
    if (items.length < 3) {
      const itemPattern = /(Item|Resolution|Report|Discussion|Consideration|Presentation|Update)\s+[:#-]?\s*([A-Z][^\n]{20,150})/gi;
      let matches = fullText.matchAll(itemPattern);
      for (const match of matches) {
        if (match[2]) {
          const item = match[2].trim().replace(/\s+/g, ' ');
          if (!seenItems.has(item)) {
            items.push(item.substring(0, 120));
            seenItems.add(item);
          }
        }
      }
    }
    
    console.log(`[SCRAPER:OKC] Extracted ${items.length} agenda items from PDF`);
    return items.slice(0, 5); // Limit to 5 items
    
  } catch (error) {
    console.error(`[SCRAPER:OKC] Error parsing PDF: ${error}`);
    return [];
  }
}

/**
 * Build document URL from PrimeGov document object
 */
function getDocumentUrl(doc: PrimeGovDocument): string {
  // If external link provided, use it
  if (doc.link) {
    return doc.link;
  }
  
  // HTML agendas (outputType 3)
  if (doc.compileOutputType === 3) {
    return `https://okc.primegov.com/Portal/Meeting?meetingTemplateId=${doc.templateId}`;
  }
  
  // PDF documents (outputType 1) and others
  return `https://okc.primegov.com/Public/CompiledDocument?meetingTemplateId=${doc.templateId}&compileOutputType=${doc.compileOutputType}`;
}
