import type { Handler } from '@netlify/functions';
import { loadEnvFile } from './utils/env-loader';
import { findNearbyCities } from './utils/legistar-cities';

interface LegistarEvent {
  EventId: number;
  EventGuid: string;
  EventBodyId: number;
  EventBodyName: string;
  EventDate: string;
  EventTime: string;
  EventLocation: string;
  EventAgendaStatusName: string;
  EventInSiteURL: string;
  EventItems?: Array<{
    EventItemTitle: string;
    EventItemAgendaNumber: string;
  }>;
}

export const handler: Handler = async (event) => {
  console.log('🏘️ LOCAL-MEETINGS: Handler invoked!');
  
  loadEnvFile();
  
  console.log('🏘️ LOCAL-MEETINGS: Request received');
  console.log('Query params:', event.queryStringParameters);
  
  const lat = parseFloat(event.queryStringParameters?.lat || '');
  const lng = parseFloat(event.queryStringParameters?.lng || '');
  const radius = parseInt(event.queryStringParameters?.radius || '50');

  console.log(`Parsed: lat=${lat}, lng=${lng}, radius=${radius}`);

  if (isNaN(lat) || isNaN(lng)) {
    console.error('Invalid lat/lng parameters');
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({ 
        error: 'Valid latitude and longitude required',
        message: 'Please provide lat and lng query parameters'
      })
    };
  }

  try {
    // Find cities within radius that use Legistar
    const nearbyCities = findNearbyCities(lat, lng, radius);
    
    console.log(`Found ${nearbyCities.length} Legistar cities within ${radius} miles:`, nearbyCities.map(c => c.name));
    
    if (nearbyCities.length === 0) {
      console.log('No Legistar cities found, returning empty array');
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600'
        },
        body: JSON.stringify([])
      };
    }

    // Fetch events from each nearby city (parallel)
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 90);
    
    const cityEventPromises = nearbyCities.slice(0, 3).map(async (city) => {
      try {
        // Legistar public API endpoint with date filter
        // $filter parameter uses OData query syntax
        const startDateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
        const url = `https://webapi.legistar.com/v1/${city.client}/events?$filter=EventDate ge datetime'${startDateStr}'`;
        console.log(`Fetching from: ${url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          console.warn(`Legistar API error for ${city.name}: ${response.status}`);
          return [];
        }

        const events: LegistarEvent[] = await response.json();
        console.log(`${city.name}: ${events.length} events returned from API`);
        
        // Filter upcoming events (within 90 days)
        const upcomingEvents = events
          .filter(evt => {
            const eventDate = new Date(evt.EventDate);
            return eventDate >= today && eventDate <= futureDate;
          })
          .slice(0, 10) // Limit per city
          .map(evt => ({
            id: `legistar-${city.client}-${evt.EventId}`,
            name: evt.EventBodyName || 'City Council Meeting',
            date: evt.EventDate,
            time: evt.EventTime || 'Time TBD',
            location: evt.EventLocation || `${city.name} City Hall`,
            committee: evt.EventBodyName || 'City Council',
            type: 'meeting',
            level: 'local' as const,
            lat: city.lat,
            lng: city.lng,
            zipCode: null,
            city: city.name,
            state: city.state,
            url: evt.EventInSiteURL || null
          }));

        return upcomingEvents;
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          console.warn(`Timeout fetching ${city.name} events`);
        } else {
          console.error(`Error fetching ${city.name} events:`, error);
        }
        return [];
      }
    });

    const allCityEvents = await Promise.all(cityEventPromises);
    const allEvents = allCityEvents.flat();

    console.log(`Total local events found: ${allEvents.length}`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      },
      body: JSON.stringify(allEvents)
    };

  } catch (error) {
    console.error('Local meetings API error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({ 
        error: 'Failed to fetch local meetings',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
