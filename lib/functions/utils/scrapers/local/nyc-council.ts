/**
 * NYC City Council Legistar Calendar Scraper
 * Custom implementation for NYC's non-standard Legistar setup
 */

import * as cheerio from 'cheerio';

export interface NYCCouncilEvent {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  committee: string;
  type: string;
  level: 'local';
  lat: number;
  lng: number;
  zipCode: null;
  url: string | null;
  docketUrl: null;
  virtualMeetingUrl: null;
  bills: null;
}

export async function scrapeNYCCouncil(): Promise<NYCCouncilEvent[]> {
  try {
    const url = 'https://legistar.council.nyc.gov/Calendar.aspx?Mode=This%20Month';
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`NYC Council calendar fetch failed: ${response.status}`);
      return [];
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const events: NYCCouncilEvent[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // NYC Legistar uses a table structure for calendar events
    // Look for rows with committee meeting data
    $('tr').each((_, row) => {
      const $row = $(row);
      const cells = $row.find('td');
      
      if (cells.length < 4) return;
      
      // Extract data from table cells
      // Actual structure: Committee | Date | Location | Time | Details
      const committeeText = cells.eq(0).text().trim();
      const dateText = cells.eq(1).text().trim();
      const locationText = cells.eq(2).text().trim(); // Swapped
      const timeText = cells.eq(3).text().trim();     // Swapped
      
      if (!committeeText || !dateText || committeeText === 'Committee') {
        return; // Skip header rows
      }
      
      try {
        // Parse date (format: MM/DD/YYYY) - skip invalid formats
        const date = parseNYCDate(dateText);
        
        // Only include future meetings
        if (date < today) {
          return;
        }
        
        // Extract meeting details link
        const detailsLink = cells.eq(5)?.find('a[href*="MeetingDetail"]').attr('href');
        const meetingUrl = detailsLink ? `https://legistar.council.nyc.gov/${detailsLink}` : null;
        
        // Generate event ID
        const dateStr = date.toISOString().split('T')[0];
        const committeeSlug = committeeText
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .substring(0, 50);
        const id = `nyc-council-${dateStr}-${committeeSlug}`;
        
        // Parse location - NYC uses "250 Broadway" format
        const location = locationText || 'NYC City Hall';
        
        // Parse time - format like "10:00 AM"
        const time = timeText || 'TBD';
        
        events.push({
          id,
          name: committeeText,
          date: dateStr,
          time,
          location,
          committee: committeeText,
          type: 'committee-meeting',
          level: 'local',
          lat: 40.7128, // NYC City Hall
          lng: -74.0060,
          zipCode: null,
          url: meetingUrl,
          docketUrl: null,
          virtualMeetingUrl: null,
          bills: null
        });
      } catch (error) {
        // Silently skip rows with invalid data (header rows, empty cells, etc.)
        // Only log if it's an unexpected error
        if (error instanceof Error && !error.message.includes('Invalid NYC date format')) {
          console.error('Error parsing NYC Council event:', error);
        }
      }
    });
    
    console.log(`✅ Scraped ${events.length} NYC Council events`);
    return events;
    
  } catch (error) {
    console.error('NYC Council scraper error:', error);
    return [];
  }
}

function parseNYCDate(dateStr: string): Date {
  // Parse dates like "12/16/2025" or "12/31/2025"
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) {
    // Try parsing without year (assumes current/next year)
    const shortMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})$/);
    if (shortMatch) {
      const month = parseInt(shortMatch[1], 10);
      const day = parseInt(shortMatch[2], 10);
      const now = new Date();
      let year = now.getFullYear();
      
      // If month is before current month, assume next year
      if (month < now.getMonth() + 1) {
        year++;
      }
      
      return new Date(year, month - 1, day);
    }
    
    throw new Error(`Invalid NYC date format: ${dateStr}`);
  }
  
  const month = parseInt(match[1], 10);
  const day = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  
  return new Date(year, month - 1, day);
}
