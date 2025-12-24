import { Event } from '../../interfaces';
import { enrichEventMetadata } from '../shared/tagging';

/**
 * Oregon Legislature Event Scraper (OpenStates)
 * 
 * Note: Oregon legislature is bicameral (Senate + House) and meets biennially (odd years)
 * in regular session starting in January. During interim periods, the official calendar
 * (olis.oregonlegislature.gov/LIZ/Committees/Meeting/List) shows no upcoming meetings.
 * 
 * Data Source: OpenStates API
 * Jurisdiction: ocd-jurisdiction/country:us/state:or/government
 * Fallback: When legislature is in session, consider migrating to direct OLIS scraping
 * 
 * Session Pattern:
 * - Regular Session: Odd-numbered years (e.g., 2025, 2027), ~160 days starting in January
 * - Special Sessions: Called by Governor or Legislature as needed
 * - Interim: Even-numbered years with limited committee activity
 */

// SECURITY: Hardcoded API key removed - must set OPENSTATES_API_KEY environment variable
const OPENSTATE_API_KEY = process.env.OPENSTATES_API_KEY || process.env.VITE_OPENSTATES_API_KEY;
const JURISDICTION = 'ocd-jurisdiction/country:us/state:or/government';
const OR_CAPITOL = { lat: 44.9429, lng: -123.0307 }; // Salem, OR

interface OpenstatesEvent {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date?: string;
  all_day?: boolean;
  location?: {
    name?: string;
    url?: string;
  };
  media?: Array<{
    name?: string;
    url?: string;
  }>;
  documents?: Array<{
    note?: string;
    url?: string;
  }>;
  sources?: Array<{
    url?: string;
  }>;
  participants?: Array<{
    name?: string;
    type?: string;
  }>;
}

interface OpenstatesResponse {
  results: OpenstatesEvent[];
  pagination?: {
    per_page?: number;
    page?: number;
    total_items?: number;
  };
}

/**
 * Parse OpenStates event to our Event format
 */
function parseOpenstatesEvent(osEvent: OpenstatesEvent): Event {
  const startDate = new Date(osEvent.start_date);
  const dateStr = startDate.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const timeStr = startDate.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });

  // Extract committee name from participants or event name
  let committeeName = osEvent.name;
  const committeeParticipant = osEvent.participants?.find(p => p.type === 'committee');
  if (committeeParticipant?.name) {
    committeeName = committeeParticipant.name;
  }

  // Get description from event description or first document
  let description = osEvent.description || '';
  if (!description && osEvent.documents && osEvent.documents.length > 0) {
    description = osEvent.documents[0].note || '';
  }

  // Get agenda URL from documents or media
  let agendaUrl = osEvent.documents?.[0]?.url || osEvent.media?.[0]?.url || null;

  // Get source URL (primary event page)
  const sourceUrl = osEvent.sources?.[0]?.url || osEvent.location?.url || null;

  return {
    id: osEvent.id || `or-${Date.now()}-${Math.random()}`,
    title: committeeName,
    date: dateStr,
    time: timeStr,
    location: osEvent.location?.name || 'Oregon State Capitol',
    type: 'Committee Meeting',
    description: description || undefined,
    sourceUrl: sourceUrl || undefined,
    agendaUrl: agendaUrl || undefined,
    lat: OR_CAPITOL.lat,
    lng: OR_CAPITOL.lng,
    state: 'OR'
  };
}

/**
 * Scrape Oregon legislative events from OpenStates API
 */
export async function scrapeOregonEvents(): Promise<Event[]> {
  try {
    console.log('Fetching Oregon events from OpenStates...');
    
    const encodedJurisdiction = encodeURIComponent(JURISDICTION);
    const url = `https://v3.openstates.org/events?jurisdiction=${encodedJurisdiction}&per_page=20`;
    
    const response = await fetch(url, {
      headers: {
        'X-API-KEY': OPENSTATE_API_KEY,
      },
    });

    if (!response.ok) {
      console.error(`OpenStates API error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data: OpenstatesResponse = await response.json();
    
    if (!data.results || data.results.length === 0) {
      console.log('No upcoming Oregon events found (legislature may be in interim)');
      return [];
    }

    console.log(`Found ${data.results.length} Oregon events from OpenStates`);

    // Parse OpenStates data
    const events = data.results.map(parseOpenstatesEvent);

    return events;
  } catch (error) {
    console.error('Error fetching Oregon events from OpenStates:', error);
    return [];
  }
}

export default scrapeOregonEvents;

export const config = {
  state: 'OR',
  name: 'Oregon',
  source: 'OpenStates API',
  sourceUrl: 'https://olis.oregonlegislature.gov/liz/2025I1/Committees/Meeting/List',
  apiUrl: `https://v3.openstates.org/events?jurisdiction=${JURISDICTION}`,
  reliability: 'medium' as const, // Medium since using third-party API
  updateFrequency: '6 hours',
  notes: [
    'Oregon legislature meets biennially in odd years (regular session ~160 days)',
    'During interim periods (even years), official calendar may show no meetings',
    'OpenStates used as fallback; consider migrating to OLIS direct scraping during session',
    'Committee structure: apps.oregonlegislature.gov/liz/[SESSION]/Committees/[CODE]/Overview'
  ]
};
