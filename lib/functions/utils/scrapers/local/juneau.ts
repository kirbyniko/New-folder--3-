import type { RawEvent } from '../base-scraper';
import { Parser } from 'xml2js';

/**
 * Juneau (City and Borough) Local Government Scraper
 * 
 * Data Source: Trumba Calendar System
 * RSS Feed: https://www.trumba.com/calendars/city-and-borough-of-juneau-events.rss
 * Web Portal: https://juneau.org/calendar
 * CivicClerk: https://juneauak.portal.civicclerk.com/
 * 
 * Includes:
 * - Assembly meetings (main legislative body)
 * - Planning Commission
 * - Airport Board, Docks & Harbors Board, Eaglecrest Board
 * - Various advisory committees and commissions
 * - Human Rights Commission, Commission on Aging, etc.
 */

const JUNEAU_COORDS = {
  lat: 58.3019,
  lng: -134.4197
};

interface TrumbaEvent {
  title: string;
  description: string;
  link: string;
  category: string;
  guid: string;
  'x-trumba:weblink'?: string;
}

export async function scrapeJuneauMeetings(): Promise<RawEvent[]> {
  const rssUrl = 'https://www.trumba.com/calendars/city-and-borough-of-juneau-events.rss';
  
  try {
    const response = await fetch(rssUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch Juneau RSS: ${response.statusText}`);
    }
    
    const xmlText = await response.text();
    const parser = new Parser();
    const result = await parser.parseStringPromise(xmlText);
    
    const items = result.rss?.channel?.[0]?.item || [];
    const events: RawEvent[] = [];
    const now = new Date();
    
    for (const item of items) {
      try {
        const title = item.title?.[0] || '';
        const description = item.description?.[0] || '';
        const link = item.link?.[0] || '';
        const category = item.category?.[0] || '';
        const weblink = item['x-trumba:weblink']?.[0] || '';
        
        // Skip if title indicates cancelled or closed
        if (title.toLowerCase().includes('cancelled') || 
            title.toLowerCase().includes('closed') ||
            title.toLowerCase().includes('holiday')) {
          continue;
        }
        
        // Parse date from category (format: "2025/12/21 (Sat)")
        const dateMatch = category.match(/(\d{4})\/(\d{2})\/(\d{2})/);
        if (!dateMatch) continue;
        
        const [, year, month, day] = dateMatch;
        
        // Parse time from description
        let timeStr = '';
        let hour = 12;
        let minute = 0;
        
        const timeMatch = description.match(/(\d{1,2})(?::(\d{2}))?\s*(?:&amp;nbsp;)?(?:&amp;ndash;|–|-)?\s*(\d{1,2})?(?::(\d{2}))?\s*(AM|PM|am|pm|a\.m\.|p\.m\.)/i);
        if (timeMatch) {
          hour = parseInt(timeMatch[1]);
          minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
          const period = timeMatch[5].toLowerCase();
          
          if (period.includes('p') && hour !== 12) {
            hour += 12;
          } else if (period.includes('a') && hour === 12) {
            hour = 0;
          }
          
          timeStr = `${timeMatch[1]}${timeMatch[2] ? ':' + timeMatch[2] : ''} ${timeMatch[5].toUpperCase()}`;
        }
        
        const eventDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), hour, minute);
        
        // Skip past events
        if (eventDate < now) continue;
        
        // Parse location from description
        let location = 'City Hall Assembly Chambers';
        const locationMatch = description.match(/(?:<br\s*\/?>|&lt;br\s*\/&gt;)([^<&]+(?:Assembly Chambers|Zoom|City Hall)[^<&]*)/i);
        if (locationMatch) {
          location = locationMatch[1]
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/<[^>]+>/g, '')
            .trim();
        }
        
        // Extract group type/committee from description
        let committee = title.split(',')[0].trim();
        const groupTypeMatch = description.match(/Group Type.*?:.*?&amp;nbsp;([^<&]+)/i);
        if (groupTypeMatch) {
          const groupType = groupTypeMatch[1].trim();
          if (groupType && groupType !== 'CBJ Staff' && groupType !== 'Other') {
            committee = groupType;
          }
        }
        
        // Clean up description
        let cleanDesc = description
          .replace(/<[^>]+>/g, ' ')
          .replace(/&lt;.*?&gt;/g, ' ')
          .replace(/&amp;nbsp;/g, ' ')
          .replace(/&amp;ndash;/g, '-')
          .replace(/&amp;#\d+;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        // Truncate if too long
        if (cleanDesc.length > 300) {
          cleanDesc = cleanDesc.substring(0, 297) + '...';
        }
        
        // Generate unique ID
        const titleHash = title.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20);
        const id = `juneau-${eventDate.getTime()}-${titleHash}`;
        
        events.push({
          id,
          name: title,
          date: eventDate.toISOString(),
          time: timeStr,
          location,
          committee,
          type: 'committee-meeting',
          level: 'local',
          description: cleanDesc,
          sourceUrl: 'https://juneau.org/calendar',
          docketUrl: weblink || undefined,
          virtualMeetingUrl: description.includes('zoom.us') ? description.match(/https?:\/\/[^\s<&]+zoom\.us[^\s<&]*/i)?.[0] : undefined
        });
      } catch (err) {
        console.error('Error parsing Juneau event:', err);
        continue;
      }
    }
    
    return events;
  } catch (error) {
    console.error('Error scraping Juneau meetings:', error);
    return [];
  }
}

export function getJuneauCalendarSources() {
  return [
    {
      name: 'City and Borough of Juneau Calendar',
      url: 'https://juneau.org/calendar',
      description: 'Assembly, boards, and commission meetings'
    },
    {
      name: 'CivicClerk Portal',
      url: 'https://juneauak.portal.civicclerk.com/',
      description: 'Meeting agendas and minutes'
    }
  ];
}
