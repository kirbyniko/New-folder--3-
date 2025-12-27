import { RawEvent } from '../base-scraper';
import { parseHTML } from '../html-parser';

/**
 * Little Rock, Arkansas City Board of Directors Scraper
 * 
 * Scrapes meetings from Little Rock Board Meeting Calendar
 * URL: https://www.littlerock.gov/city-administration/board-of-directors/board-meeting-calendar/
 * 
 * Regular meetings: 1st & 3rd Tuesday at 6:00 PM
 * Agenda meetings: 2nd & 4th Tuesday at 4:00 PM
 * Location: Board Room at City Hall, 500 W. Markham Street
 */

const CALENDAR_URL = 'https://www.littlerock.gov/city-administration/board-of-directors/board-meeting-calendar/';
const AGENDAS_URL = 'https://www.littlerock.gov/city-administration/board-of-directors/meeting-agendas/';

/**
 * Scrape Little Rock City Board of Directors meetings
 */
export async function scrapeLittleRockMeetings(): Promise<RawEvent[]> {
  try {
    console.log(`[Little Rock] Fetching Board Meeting Calendar from ${CALENDAR_URL}`);
    
    const response = await fetch(CALENDAR_URL, {
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

    const rawEvents: RawEvent[] = [];

    // Little Rock City Hall coordinates
    const lat = 34.7465;
    const lng = -92.2896;

    // Parse the meeting tables for each month
    // Each table has <tbody> with rows like:
    // <td>January 7th</td><td>6:00 PM: Regular Board Meeting.</td>
    
    $('table.table-striped tbody tr').each((_, row) => {
      const $row = $(row);
      const cells = $row.find('td');
      
      if (cells.length !== 2) return; // Skip header rows
      
      const dateCell = cells.eq(0).text().trim();
      const descriptionCell = cells.eq(1).text().trim();
      
      // Skip "not in session" entries
      if (descriptionCell.toLowerCase().includes('not be in session')) {
        return;
      }
      
      // Parse date like "January 7th" or "February 14th"
      const parsedDate = parseLittleRockDate(dateCell);
      if (!parsedDate) {
        return;
      }
      
      // Extract meeting type and time from description
      // Examples:
      // "6:00 PM: Regular Board Meeting."
      // "4:00 PM: Agenda Meeting to set the Agenda for the January 21st Board Meeting."
      const timeMatch = descriptionCell.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
      const time = timeMatch ? timeMatch[1] : 'Time TBD';
      
      // Determine meeting name
      let meetingName = 'City Board of Directors Meeting';
      if (descriptionCell.toLowerCase().includes('agenda meeting')) {
        meetingName = 'City Board Agenda Meeting';
      } else if (descriptionCell.toLowerCase().includes('budget meeting')) {
        meetingName = 'City Board Budget Meeting';
      } else if (descriptionCell.toLowerCase().includes('regular board meeting')) {
        meetingName = 'City Board Regular Meeting';
      }
      
      const eventId = `littlerock-${parsedDate}-${time.replace(/[:\s]/g, '')}`;
      
      rawEvents.push({
        id: eventId,
        name: meetingName,
        date: parsedDate,
        time,
        location: 'Board Room at City Hall, 500 W. Markham Street',
        committee: 'Board of Directors',
        type: 'city-council',
        level: 'local',
        state: 'AR',
        city: 'Little Rock',
        lat,
        lng,
        description: descriptionCell,
        sourceUrl: CALENDAR_URL,
      });
    });

    console.log(`[Little Rock] Extracted ${rawEvents.length} Board of Directors meetings`);
    
    // Filter to only future meetings (within next 6 months)
    const now = new Date();
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    
    const futureMeetings = rawEvents.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate >= now && eventDate <= sixMonthsFromNow;
    });
    
    console.log(`[Little Rock] Filtered to ${futureMeetings.length} meetings in next 6 months`);
    return futureMeetings;
  } catch (error) {
    console.error('[Little Rock] Scraping failed:', error);
    return [];
  }
}

/**
 * Parse Little Rock date format: "January 7th" or "February 14th" or "March 21st"
 * Returns ISO date string: "YYYY-MM-DD"
 * 
 * The page shows the current year's calendar, so we use the current year
 * unless the month has already passed (then we use next year)
 */
function parseLittleRockDate(dateStr: string): string | null {
  try {
    // Remove ordinal suffixes (st, nd, rd, th)
    const cleanDate = dateStr.replace(/(\d+)(st|nd|rd|th)/, '$1');
    
    // Extract month and day
    // Format: "January 7" or "February 14"
    const match = cleanDate.match(/([A-Z][a-z]+)\s+(\d{1,2})/);
    
    if (!match) {
      return null;
    }

    const [, monthName, day] = match;
    
    // Convert month name to number
    const monthMap: Record<string, string> = {
      'January': '01', 'February': '02', 'March': '03', 'April': '04',
      'May': '05', 'June': '06', 'July': '07', 'August': '08',
      'September': '09', 'October': '10', 'November': '11', 'December': '12'
    };
    
    const month = monthMap[monthName];
    if (!month) {
      return null;
    }

    // Start with current year
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-indexed
    const currentDay = now.getDate();
    
    let year = currentYear;
    const targetMonth = parseInt(month, 10);
    const targetDay = parseInt(day, 10);
    
    // If the target date is in the past this year, use next year
    if (targetMonth < currentMonth || (targetMonth === currentMonth && targetDay < currentDay)) {
      year = currentYear + 1;
    }

    const date = `${year}-${month}-${day.padStart(2, '0')}`;
    return date;
  } catch (error) {
    return null;
  }
}
