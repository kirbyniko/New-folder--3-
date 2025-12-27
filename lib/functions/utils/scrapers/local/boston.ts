/**
 * Boston City Council & BPDA Scraper (Legistar)
 * Scrapes meetings from Boston's Legistar system
 */

import type { RawEvent } from '../types.js';

const BOSTON_CLIENT_ID = 'boston';
const LEGISTAR_BASE = 'https://webapi.legistar.com/v1';

interface LegistarEvent {
  EventId: number;
  EventBodyName: string;
  EventDate: string;
  EventTime: string | null;
  EventLocation: string | null;
  EventAgendaFile: string | null;
  EventAgendaLastPublishedUTC: string | null;
}

/**
 * Scrape Boston city council and BPDA meetings
 */
export async function scrapeBostonMeetings(): Promise<RawEvent[]> {
  const events: RawEvent[] = [];
  
  try {
    // Get current and next month's events
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 2);
    
    const startDate = today.toISOString().split('T')[0];
    const endDate = nextMonth.toISOString().split('T')[0];
    
    const url = `${LEGISTAR_BASE}/${BOSTON_CLIENT_ID}/events`;
    const params = new URLSearchParams({
      $filter: `EventDate ge datetime'${startDate}' and EventDate le datetime'${endDate}'`,
      $orderby: 'EventDate'
    });
    
    console.log(`[BOSTON] Fetching events from ${url}?${params}`);
    
    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`[BOSTON] HTTP ${response.status}: ${response.statusText}`);
      return [];
    }
    
    const data: LegistarEvent[] = await response.json();
    console.log(`[BOSTON] Found ${data.length} meetings`);
    
    for (const meeting of data) {
      const eventDate = new Date(meeting.EventDate);
      const dateStr = eventDate.toISOString().split('T')[0];
      
      // Parse time if available
      let timeStr: string | undefined;
      if (meeting.EventTime) {
        const match = meeting.EventTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (match) {
          timeStr = `${match[1]}:${match[2]} ${match[3].toUpperCase()}`;
        }
      }
      
      // Build agenda URL
      let docketUrl: string | undefined;
      if (meeting.EventAgendaFile) {
        docketUrl = `https://boston.legistar1.com/${BOSTON_CLIENT_ID}/${meeting.EventAgendaFile}`;
      } else if (meeting.EventId) {
        docketUrl = `https://webapi.legistar.com/v1/${BOSTON_CLIENT_ID}/events/${meeting.EventId}/AgendaFile`;
      }
      
      events.push({
        id: `boston-${meeting.EventId}`,
        name: meeting.EventBodyName || 'Boston Meeting',
        date: dateStr,
        time: timeStr,
        location: meeting.EventLocation || 'Boston, MA',
        lat: 42.3601,  // Boston City Hall
        lng: -71.0589,
        level: 'local',
        type: 'meeting',
        state: 'MA',
        description: `${meeting.EventBodyName} meeting`,
        detailsUrl: `https://boston.legistar.com/MeetingDetail.aspx?ID=${meeting.EventId}`,
        docketUrl,
        sourceUrl: `https://boston.legistar.com/Calendar.aspx`,
        allowsPublicParticipation: true
      });
    }
    
    console.log(`[BOSTON] Converted ${events.length} events`);
    
  } catch (error) {
    console.error('[BOSTON] Scraper error:', error);
  }
  
  return events;
}
