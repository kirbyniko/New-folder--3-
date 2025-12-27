/**
 * Santa Fe, NM City Council Meeting Scraper
 * Source: CivicClerk Portal (React SPA)
 * URL: https://santafenm.portal.civicclerk.com/
 * Method: Puppeteer (client-side rendered)
 */

import { scrapeWithPuppeteer } from '../puppeteer-helper';
import type { RawEvent } from '../base-scraper';

export async function scrapeSantaFeMeetings(): Promise<RawEvent[]> {
  const url = 'https://santafenm.portal.civicclerk.com/';
  
  console.log('[SCRAPER:SantaFe] 🏛️ Scraping Santa Fe City Council meetings...');
  
  try {
    const events = await scrapeWithPuppeteer(url, {
      waitFor: 5000, // Wait for React to render
      evaluate: async (page) => {
        // Wait for content to load
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Extract events from the rendered page
        const eventData = await page.evaluate(() => {
          const events: any[] = [];
          
          // CivicClerk uses Material-UI list with event items
          const eventList = document.querySelector('#Event-list');
          if (!eventList) {
            console.log('Event list not found!');
            return events;
          }
          
          // Get all list items with data-id (actual events, not subheaders)
          const meetingElements = Array.from(eventList.querySelectorAll('a[data-id]'));
          console.log(`Found ${meetingElements.length} event items`);
          
          for (const element of meetingElements) {
            try {
              const link = element as HTMLAnchorElement;
              const dataId = link.getAttribute('data-id');
              const dataDate = link.getAttribute('data-date'); // ISO date string
              
              // Extract title from h6 elements (committee name appears in multiple places)
              const h6Elements = Array.from(link.querySelectorAll('h6'));
              const title = h6Elements[0]?.textContent?.trim() || 'City Council Meeting';
              
              // Extract location from the second h6 (contains address)
              const locationH6 = h6Elements.find(h6 => 
                h6.textContent?.includes('Santa Fe') || 
                h6.textContent?.includes('City Hall') ||
                h6.textContent?.includes('Chambers')
              );
              const location = locationH6?.textContent?.trim() || 'City Hall';
              
              // Extract committee/type from chip label
              const chipLabel = link.querySelector('.MuiChip-label');
              const committee = chipLabel?.textContent?.trim() || title;
              
              // Get the event detail URL (click opens detail page with agenda)
              const eventUrl = `https://santafenm.portal.civicclerk.com/event/${dataId}`;
              
              events.push({
                id: dataId,
                title,
                dateText: dataDate, // Already in ISO format
                location,
                committee,
                detailUrl: eventUrl,
                rawText: link.textContent?.substring(0, 300) || ''
              });
            } catch (err) {
              console.error('Error parsing event:', err);
            }
          }
          
          return events;
        });
        
        return eventData;
      }
    });
    
    console.log(`[SCRAPER:SantaFe] 📊 Found ${events.length} raw events from Puppeteer`);
    
    // Convert to RawEvent format
    const rawEvents: RawEvent[] = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    for (const event of events) {
      try {
        // Parse date - already in ISO format from data-date attribute
        const eventDate = new Date(event.dateText);
        
        if (isNaN(eventDate.getTime())) {
          console.log(`[SCRAPER:SantaFe] Invalid date: ${event.dateText}`);
          continue;
        }
        
        // Skip past events
        if (eventDate < today) {
          console.log(`[SCRAPER:SantaFe] Skipping past event: ${event.title} on ${event.dateText}`);
          continue;
        }
        
        // Format time from ISO date
        let timeStr: string | undefined;
        const hour = eventDate.getHours();
        const minute = eventDate.getMinutes();
        if (hour > 0 || minute > 0) {
          const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
          const ampm = hour >= 12 ? 'PM' : 'AM';
          timeStr = `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
        }
        
        const id = `santa-fe-${event.id}-${eventDate.getTime()}`;
        
        rawEvents.push({
          id,
          name: event.title || 'City Council Meeting',
          date: eventDate.toISOString(),
          time: timeStr,
          location: event.location || 'Santa Fe City Hall',
          committee: event.committee || 'Santa Fe City Council',
          type: 'committee-meeting',
          level: 'local',
          state: 'NM',
          city: 'Santa Fe',
          lat: 35.6870,
          lng: -105.9378,
          zipCode: null,
          description: `Event ID: ${event.id}. Click event for agenda details.`,
          sourceUrl: url,
          docketUrl: event.detailUrl, // Link to event detail page with agenda
          virtualMeetingUrl: undefined
        });
      } catch (error) {
        console.error(`[SCRAPER:SantaFe] Error parsing event:`, error);
        continue;
      }
    }
    
    console.log(`[SCRAPER:SantaFe] ✅ Converted ${rawEvents.length} upcoming Santa Fe events`);
    return rawEvents;
    
  } catch (error) {
    console.error('[SCRAPER:SantaFe] ❌ Scraping failed:', error);
    return [];
  }
}

export function getSantaFeCalendarSources() {
  return [
    {
      name: 'Santa Fe City Council Calendar',
      url: 'https://santafenm.portal.civicclerk.com/',
      type: 'primary' as const,
      lastChecked: new Date().toISOString(),
      status: 'active' as const,
      notes: 'Official CivicClerk portal for Santa Fe city meetings'
    }
  ];
}
