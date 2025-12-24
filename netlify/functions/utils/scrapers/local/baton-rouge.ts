import { RawEvent } from '../../../types';
import { parseHTML } from '../html-parser';

/**
 * Baton Rouge, Louisiana Metropolitan Council Scraper
 * 
 * Scrapes meetings from Baton Rouge Metropolitan Council AgendaCenter
 * URL: https://www.brla.gov/AgendaCenter/Metropolitan-Council-3
 * 
 * CivicPlus AgendaCenter system with static HTML rendering
 * Meetings are in <tr class="catAgendaRow"> table rows
 */

const BASE_URL = 'https://www.brla.gov';
const AGENDA_URL = `${BASE_URL}/AgendaCenter/Metropolitan-Council-3`;

interface AgendaItem {
  date: string;
  title: string;
  agendaUrl: string;
  videoUrl?: string;
  minutesUrl?: string;
}

/**
 * Scrape Baton Rouge Metropolitan Council meetings from AgendaCenter
 */
export async function scrapeBaronRougeMeetings(): Promise<RawEvent[]> {
  try {
    console.log(`[Baton Rouge] Fetching Metropolitan Council agendas from ${AGENDA_URL}`);
    
    const response = await fetch(AGENDA_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = parseHTML(html);

    const agendaItems: AgendaItem[] = [];

    // Find all agenda rows in the table
    $('tr.catAgendaRow').each((_, row) => {
      const $row = $(row);
      
      // Extract date from strong tag with aria-label
      const dateElement = $row.find('strong[aria-label*="Agenda for"]');
      const dateText = dateElement.text().trim(); // e.g., "Dec 10, 2025"
      
      if (!dateText) return;

      // Extract meeting title and agenda URL from the main link
      const agendaLink = $row.find('a[href*="/AgendaCenter/ViewFile/Agenda/"]').first();
      const title = agendaLink.text().trim();
      const agendaPath = agendaLink.attr('href');
      
      if (!title || !agendaPath) return;

      // Check for video link
      const videoLink = $row.find('a[href*="swagit.com"]');
      const videoUrl = videoLink.attr('href');

      // Check for minutes link
      const minutesLink = $row.find('a[href*="/AgendaCenter/ViewFile/Minutes/"]');
      const minutesUrl = minutesLink.attr('href');

      agendaItems.push({
        date: dateText,
        title,
        agendaUrl: agendaPath.startsWith('http') ? agendaPath : `${BASE_URL}${agendaPath}`,
        videoUrl: videoUrl || undefined,
        minutesUrl: minutesUrl ? (minutesUrl.startsWith('http') ? minutesUrl : `${BASE_URL}${minutesUrl}`) : undefined,
      });
    });

    console.log(`[Baton Rouge] Found ${agendaItems.length} agenda items`);

    const rawEvents: RawEvent[] = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Start of today

    for (const item of agendaItems) {
      // Parse date from format like "Dec 10, 2025"
      const parsedDate = parseAgendaDate(item.date);
      if (!parsedDate) {
        console.warn(`[Baton Rouge] Could not parse date: ${item.date}`);
        continue;
      }

      const { date, time } = parsedDate;

      // Filter out past events
      const eventDate = new Date(date);
      if (eventDate < today) {
        console.log(`[Baton Rouge] Skipping past event: ${item.title} on ${date}`);
        continue;
      }

      // Baton Rouge City Hall coordinates
      const lat = 30.4515;
      const lng = -91.1871;

      rawEvents.push({
        id: `batonrouge-${date}-${Buffer.from(item.title).toString('base64').substring(0, 8)}`,
        name: item.title,
        date,
        time: time || 'Time TBD',
        location: 'Baton Rouge City Hall, 222 Saint Louis Street',
        committee: 'Metropolitan Council',
        type: 'city-council',
        level: 'local',
        state: 'LA',
        city: 'Baton Rouge',
        lat,
        lng,
        description: '',
        sourceUrl: 'https://www.brla.gov',
        docketUrl: item.agendaUrl, // Link to agenda page (PDF or HTML)
      });
    }

    console.log(`[Baton Rouge] Extracted ${rawEvents.length} upcoming Metropolitan Council meetings (filtered past events)`);
    return rawEvents;
  } catch (error) {
    console.error('[Baton Rouge] Scraping failed:', error);
    return [];
  }
}

/**
 * Parse Baton Rouge date format: "Dec 10, 2025" or "Jan 14, 2026"
 * Returns { date: "YYYY-MM-DD", time: "4:00 PM" or null }
 */
function parseAgendaDate(dateStr: string): { date: string; time: string | null } | null {
  try {
    // Format: "Dec 10, 2025" or "Jan 14, 2026"
    const match = dateStr.match(/([A-Z][a-z]{2})\s+(\d{1,2}),\s+(\d{4})/);
    
    if (!match) {
      return null;
    }

    const [, monthAbbr, day, year] = match;
    
    // Convert month abbreviation to number
    const monthMap: Record<string, string> = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
      'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
      'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    
    const month = monthMap[monthAbbr];
    if (!month) {
      return null;
    }

    const date = `${year}-${month}-${day.padStart(2, '0')}`;
    
    // Metropolitan Council regular meetings are 2nd and 4th Wednesday at 4:00 PM
    // Zoning meetings are 3rd Wednesday at 4:00 PM
    // We can default to 4:00 PM for all meetings
    const time = '4:00 PM';

    return { date, time };
  } catch (error) {
    return null;
  }
}
