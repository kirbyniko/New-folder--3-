# CivicPulse Rebuild: Real Government APIs

## Mission
Build a civic engagement platform that displays **upcoming legislative events** (committee meetings, hearings, town halls) near any US ZIP code using **official government APIs only**. NO mock data, NO fallbacks, NO Legistar scraping.

## Critical Discovery
After extensive API research, we confirmed that **Congress.gov API** and **OpenStates API** both provide UPCOMING legislative events with dates, times, and locations. The previous Legistar scraping approach was rejected because it doesn't scale (only 12 hardcoded cities out of 19,000+ US municipalities).

---

## Architecture Overview

### Data Sources (All Official APIs)
1. **Federal Events**: Congress.gov API `/committee-meeting` endpoint
2. **State Events**: OpenStates/Plural Policy API `/events` endpoint
3. **Local Events**: TBD - Need scalable solution (Legistar Web API requires paid access)

### Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Netlify Functions (serverless)
- **APIs**: Congress.gov API v3, OpenStates API v3
- **Geocoding**: OpenStreetMap Nominatim
- **Distance**: Haversine formula

---

## Phase 1: Setup API Keys

### Required API Keys
1. **Congress.gov API**
   - Sign up: https://api.congress.gov/sign-up/
   - Free, instant approval
   - Add to `.env`: `VITE_CONGRESS_API_KEY=your_key_here`

2. **OpenStates/Plural Policy API**
   - Register: https://open.pluralpolicy.com/accounts/profile/
   - Free for non-commercial use
   - Add to `.env`: `VITE_OPENSTATES_API_KEY=your_key_here`

### Create `.env` file
```env
# Congress.gov API Key (REQUIRED for federal legislative data)
VITE_CONGRESS_API_KEY=your_congress_api_key_here

# OpenStates API Key (REQUIRED for state legislative data)
VITE_OPENSTATES_API_KEY=your_openstates_api_key_here
```

---

## Phase 2: Federal Events (Congress.gov API)

### Endpoint
```
GET https://api.congress.gov/v3/committee-meeting
```

### Query Parameters
- `api_key`: Your API key (REQUIRED)
- `format=json`
- `limit`: Number of results (default 20, max 250)
- `offset`: Pagination
- `fromDateTime`: Filter by update date (ISO 8601)
- `toDateTime`: Filter by update date (ISO 8601)

### Response Fields (Key)
```json
{
  "committeeMeetings": [
    {
      "eventId": "115538",
      "congress": 118,
      "chamber": "House",
      "date": "2023-03-24T13:00:00Z",
      "meetingStatus": "Scheduled",
      "type": "Hearing",
      "title": "Legislative hearing on...",
      "committees": [
        {
          "systemCode": "hsii24",
          "name": "House Natural Resources Subcommittee..."
        }
      ],
      "location": {
        "room": "1324",
        "building": "Longworth House Office Building"
      },
      "updateDate": "2023-03-27T18:11:19Z"
    }
  ]
}
```

### Implementation Requirements
1. **Filter upcoming events**: `date` >= current date
2. **Parse DC coordinates**: All federal events at Washington DC (38.8899, -77.0091, ZIP 20515)
3. **Map committee names**: Extract clean committee names
4. **Handle status**: Show only "Scheduled" events (skip Canceled/Postponed)
5. **Cache**: 1-hour TTL (meetings don't change frequently)
6. **Rate limit**: 10 requests/minute

### Netlify Function: `netlify/functions/congress-meetings.ts`
```typescript
import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  const apiKey = process.env.VITE_CONGRESS_API_KEY;
  
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Congress.gov API key not configured' })
    };
  }

  try {
    // Get current congress (119th as of 2025)
    const congress = 119;
    
    const response = await fetch(
      `https://api.congress.gov/v3/committee-meeting/${congress}?api_key=${apiKey}&format=json&limit=250`,
      {
        headers: {
          'User-Agent': 'CivicPulse/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Congress.gov API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Filter upcoming events
    const now = new Date();
    const upcomingMeetings = data.committeeMeetings
      .filter((meeting: any) => {
        const meetingDate = new Date(meeting.date);
        return meetingDate >= now && meeting.meetingStatus === 'Scheduled';
      })
      .map((meeting: any) => ({
        id: `congress-${meeting.eventId}`,
        name: meeting.title || 'Committee Meeting',
        date: meeting.date,
        time: new Date(meeting.date).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
        location: meeting.location 
          ? `${meeting.location.building || ''} ${meeting.location.room || ''}`.trim()
          : 'Washington, DC',
        committee: meeting.committees?.[0]?.name || 'Committee',
        type: meeting.type || 'Meeting',
        level: 'federal',
        lat: 38.8899,
        lng: -77.0091,
        zipCode: '20515'
      }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      },
      body: JSON.stringify(upcomingMeetings)
    };

  } catch (error) {
    console.error('Congress.gov API error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to fetch federal events',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
```

---

## Phase 3: State Events (OpenStates API)

### Endpoint
```
GET https://v3.openstates.org/events
```

### Query Parameters
- `apikey`: Your API key (REQUIRED) OR header `X-API-KEY`
- `jurisdiction`: State jurisdiction (e.g., `ocd-jurisdiction/country:us/state:ca/government`)
- `start_date`: Filter events after date (YYYY-MM-DD)
- `end_date`: Filter events before date (YYYY-MM-DD)
- `per_page`: Results per page (default 20, max 100)

### Response Fields (Key)
```json
{
  "results": [
    {
      "id": "ocd-event/...",
      "name": "Senate Education Committee Meeting",
      "description": "Discussion of SB 123",
      "classification": "committee-meeting",
      "start_date": "2025-12-20T10:00:00-08:00",
      "end_date": "2025-12-20T12:00:00-08:00",
      "status": "confirmed",
      "location": {
        "name": "State Capitol, Room 112",
        "coordinates": {
          "latitude": "38.5767",
          "longitude": "-121.4934"
        }
      },
      "participants": [
        {
          "name": "Senate Education Committee",
          "entity_type": "organization"
        }
      ]
    }
  ]
}
```

### State Jurisdiction IDs
All 50 states follow pattern: `ocd-jurisdiction/country:us/state:{abbr}/government`
- Example: California = `ocd-jurisdiction/country:us/state:ca/government`

### Implementation Requirements
1. **Detect user's state**: From geocoded ZIP code
2. **Fetch state events**: For detected state only
3. **Parse coordinates**: Use capitol coordinates as fallback
4. **Filter upcoming**: `start_date` >= current date, `status` = "confirmed"
5. **Cache**: 1-hour TTL
6. **Rate limit**: 10 requests/minute

### Netlify Function: `netlify/functions/state-events.ts`
```typescript
import type { Handler } from '@netlify/functions';

const STATE_JURISDICTIONS: Record<string, { id: string; capitol: { lat: number; lng: number; city: string } }> = {
  'AL': { id: 'ocd-jurisdiction/country:us/state:al/government', capitol: { lat: 32.3617, lng: -86.2792, city: 'Montgomery' } },
  'CA': { id: 'ocd-jurisdiction/country:us/state:ca/government', capitol: { lat: 38.5767, lng: -121.4934, city: 'Sacramento' } },
  // ... all 50 states
};

export const handler: Handler = async (event) => {
  const stateAbbr = event.queryStringParameters?.state?.toUpperCase();
  
  if (!stateAbbr || !STATE_JURISDICTIONS[stateAbbr]) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Valid state abbreviation required' })
    };
  }

  const apiKey = process.env.VITE_OPENSTATES_API_KEY;
  
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'OpenStates API key not configured' })
    };
  }

  try {
    const state = STATE_JURISDICTIONS[stateAbbr];
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 90);
    const endDate = futureDate.toISOString().split('T')[0];

    const response = await fetch(
      `https://v3.openstates.org/events?jurisdiction=${state.id}&start_date=${today}&end_date=${endDate}&per_page=100`,
      {
        headers: {
          'X-API-KEY': apiKey
        }
      }
    );

    if (!response.ok) {
      throw new Error(`OpenStates API error: ${response.status}`);
    }

    const data = await response.json();
    
    const events = data.results
      .filter((event: any) => event.status === 'confirmed')
      .map((event: any) => ({
        id: event.id,
        name: event.name,
        date: event.start_date,
        time: new Date(event.start_date).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
        location: event.location?.name || state.capitol.city,
        committee: event.participants?.[0]?.name || 'State Legislature',
        type: event.classification || 'meeting',
        level: 'state',
        lat: event.location?.coordinates?.latitude || state.capitol.lat,
        lng: event.location?.coordinates?.longitude || state.capitol.lng,
        zipCode: null // Will calculate from coordinates
      }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      },
      body: JSON.stringify(events)
    };

  } catch (error) {
    console.error('OpenStates API error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to fetch state events',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
```

---

## Phase 4: Geocoding & Distance Calculation

### Geocoding Service
Use OpenStreetMap Nominatim (no API key required):
```typescript
async function geocodeZipCode(zipCode: string) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?postalcode=${zipCode}&country=us&format=json&addressdetails=1`,
    {
      headers: {
        'User-Agent': 'CivicPulse/1.0'
      }
    }
  );
  
  const data = await response.json();
  
  if (data.length === 0) {
    throw new Error('ZIP code not found');
  }
  
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    state: data[0].address?.state,
    city: data[0].address?.city || data[0].address?.town
  };
}
```

### Haversine Distance Formula
```typescript
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
```

---

## Phase 5: Frontend Integration

### Update `src/App.tsx`
```typescript
async function handleSearch(zipCode: string, radius: number) {
  setLoading(true);
  setError(null);
  
  try {
    // 1. Geocode ZIP code
    const location = await geocodeZipCode(zipCode);
    
    // 2. Fetch federal events
    const federalResponse = await fetch('/.netlify/functions/congress-meetings');
    const federalEvents = await federalResponse.json();
    
    // 3. Fetch state events (if state detected)
    let stateEvents = [];
    if (location.state) {
      const stateAbbr = STATE_NAME_TO_ABBR[location.state];
      if (stateAbbr) {
        const stateResponse = await fetch(`/.netlify/functions/state-events?state=${stateAbbr}`);
        stateEvents = await stateResponse.json();
      }
    }
    
    // 4. Combine and filter by distance
    const allEvents = [...federalEvents, ...stateEvents];
    const nearbyEvents = allEvents
      .map(event => ({
        ...event,
        distance: calculateDistance(location.lat, location.lng, event.lat, event.lng)
      }))
      .filter(event => event.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
    
    setEvents(nearbyEvents);
    
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
}
```

---

## Phase 6: Local Events (Future)

### Challenge
Municipal governments don't have a unified API. Options:
1. **Legistar API** (paid, ~200 cities) - enterprise solution
2. **Individual city APIs** (fragmented)
3. **Community crowdsourcing** (long-term)

### Recommendation
Start with federal + state only. Add local events later as resources allow.

---

## Testing Checklist

### Federal Events
- [ ] Congress.gov API key configured
- [ ] Fetches upcoming committee meetings
- [ ] Filters by "Scheduled" status
- [ ] Parses dates correctly
- [ ] Shows DC location (20515)
- [ ] Caches responses (1 hour)

### State Events
- [ ] OpenStates API key configured
- [ ] Detects state from ZIP code
- [ ] Fetches events for correct state
- [ ] Filters by "confirmed" status
- [ ] Uses capitol coordinates as fallback
- [ ] Handles all 50 states

### Distance Calculation
- [ ] Haversine formula accurate
- [ ] Filters by radius correctly
- [ ] Sorts by distance (nearest first)
- [ ] Displays distance in miles

### User Experience
- [ ] NO mock/placeholder data
- [ ] Clear error messages
- [ ] Loading states
- [ ] Empty state when no events found
- [ ] Responsive design

---

## Success Criteria

1. **Search any US ZIP code** → Returns real upcoming events
2. **Federal events** → From Congress.gov API
3. **State events** → From OpenStates API (for detected state)
4. **Accurate distances** → Using Haversine formula
5. **NO fallbacks** → Real data only, clear errors if API fails
6. **Scalable** → Works for ANY ZIP code, no hardcoding

---

## Critical Notes

- **NO Legistar scraping** - Doesn't scale, user rejected this approach
- **NO placeholder data** - User requirement: "There will be no fallbacks"
- **API keys required** - Application won't work without them
- **Rate limiting** - Respect API limits (10 req/min recommended)
- **Error handling** - Clear messages when APIs fail or keys missing

---

## Next Steps

1. **Get API keys** (Congress.gov + OpenStates)
2. **Create `.env` file** with keys
3. **Implement federal events** (Congress.gov)
4. **Implement state events** (OpenStates)
5. **Test with real ZIP codes** across different states
6. **Deploy to Netlify** with environment variables

Good luck! 🚀
