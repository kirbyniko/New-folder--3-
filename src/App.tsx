import { useState, useEffect } from 'react'
import { geocodeZipCode, calculateDistance } from './utils/geocoding'
import type { LegislativeEvent } from './types/event'
import TabbedEvents from './components/TabbedEvents'
import StateSelector from './components/StateSelector'
import TagFilter from './components/TagFilter'
import { EnrichmentNotice } from './components/EnrichmentNotice'
import StateSidebar from './components/StateSidebar'
import { SourceLinks } from './components/SourceLinks'
import { getApiUrl } from './config/api'
import { autoTagEvent } from './utils/tagging'
import './App.css'

// State capitol coordinates for default locations
const STATE_CAPITOLS: Record<string, { lat: number; lng: number; zip: string }> = {
  'AL': { lat: 32.3617, lng: -86.2792, zip: '36104' }, 'AK': { lat: 58.3019, lng: -134.4197, zip: '99801' },
  'AZ': { lat: 33.4484, lng: -112.0740, zip: '85007' }, 'AR': { lat: 34.7465, lng: -92.2896, zip: '72201' },
  'CA': { lat: 38.5767, lng: -121.4934, zip: '95814' }, 'CO': { lat: 39.7392, lng: -104.9903, zip: '80202' },
  'CT': { lat: 41.7658, lng: -72.6734, zip: '06103' }, 'DE': { lat: 39.1582, lng: -75.5244, zip: '19901' },
  'FL': { lat: 30.4383, lng: -84.2807, zip: '32301' }, 'GA': { lat: 33.7490, lng: -84.3880, zip: '30303' },
  'HI': { lat: 21.3099, lng: -157.8581, zip: '96813' }, 'ID': { lat: 43.6150, lng: -116.2023, zip: '83702' },
  'IL': { lat: 39.7817, lng: -89.6501, zip: '62701' }, 'IN': { lat: 39.7684, lng: -86.1581, zip: '46204' },
  'IA': { lat: 41.5868, lng: -93.6250, zip: '50319' }, 'KS': { lat: 39.0473, lng: -95.6752, zip: '66612' },
  'KY': { lat: 38.1867, lng: -84.8753, zip: '40601' }, 'LA': { lat: 30.4583, lng: -91.1403, zip: '70801' },
  'ME': { lat: 44.3106, lng: -69.7795, zip: '04330' }, 'MD': { lat: 38.9784, lng: -76.4922, zip: '21401' },
  'MA': { lat: 42.3601, lng: -71.0589, zip: '02133' }, 'MI': { lat: 42.7325, lng: -84.5555, zip: '48933' },
  'MN': { lat: 44.9537, lng: -93.0900, zip: '55101' }, 'MS': { lat: 32.2988, lng: -90.1848, zip: '39201' },
  'MO': { lat: 38.5767, lng: -92.1736, zip: '65101' }, 'MT': { lat: 46.5891, lng: -112.0391, zip: '59601' },
  'NE': { lat: 40.8136, lng: -96.7026, zip: '68508' }, 'NV': { lat: 39.1638, lng: -119.7674, zip: '89701' },
  'NH': { lat: 43.2081, lng: -71.5376, zip: '03301' }, 'NJ': { lat: 40.2206, lng: -74.7597, zip: '08608' },
  'NM': { lat: 35.6870, lng: -105.9378, zip: '87501' }, 'NY': { lat: 42.6526, lng: -73.7562, zip: '12207' },
  'NC': { lat: 35.7796, lng: -78.6382, zip: '27601' }, 'ND': { lat: 46.8083, lng: -100.7837, zip: '58501' },
  'OH': { lat: 39.9612, lng: -82.9988, zip: '43215' }, 'OK': { lat: 35.4676, lng: -97.5164, zip: '73102' },
  'OR': { lat: 44.9429, lng: -123.0351, zip: '97301' }, 'PA': { lat: 40.2644, lng: -76.8831, zip: '17101' },
  'RI': { lat: 41.8240, lng: -71.4128, zip: '02903' }, 'SC': { lat: 34.0007, lng: -81.0348, zip: '29201' },
  'SD': { lat: 44.3683, lng: -100.3361, zip: '57501' }, 'TN': { lat: 36.1627, lng: -86.7816, zip: '37203' },
  'TX': { lat: 30.2747, lng: -97.7404, zip: '78701' }, 'UT': { lat: 40.7608, lng: -111.8910, zip: '84114' },
  'VT': { lat: 44.2601, lng: -72.5754, zip: '05633' }, 'VA': { lat: 37.5407, lng: -77.4360, zip: '23219' },
  'WA': { lat: 47.0379, lng: -122.9007, zip: '98501' }, 'WV': { lat: 38.3498, lng: -81.6326, zip: '25301' },
  'WI': { lat: 43.0731, lng: -89.4012, zip: '53703' }, 'WY': { lat: 41.1400, lng: -104.8202, zip: '82001' }
}

function App() {
  const [zipCode, setZipCode] = useState('03054')
  const [radius, setRadius] = useState(50)
  const [selectedState, setSelectedState] = useState<string | null>(null)
  const [searchedState, setSearchedState] = useState<string | null>(null) // State from ZIP code search
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [federalEvents, setFederalEvents] = useState<LegislativeEvent[]>([])
  const [stateEvents, setStateEvents] = useState<LegislativeEvent[]>([])
  const [localEvents, setLocalEvents] = useState<LegislativeEvent[]>([])
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isStateSearch, setIsStateSearch] = useState(false)
  const [calendarSources, setCalendarSources] = useState<{ name: string; url: string; description: string }[]>([])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!zipCode || zipCode.length !== 5) {
      setError('Please enter a valid 5-digit ZIP code')
      return
    }

    setLoading(true)
    setError(null)
    setFederalEvents([])
    setStateEvents([])
    setLocalEvents([])
    setCalendarSources([]) // Reset calendar sources
    setIsStateSearch(false)

    try {
      // 1. Geocode ZIP code
      const location = await geocodeZipCode(zipCode)
      setUserLocation({ lat: location.lat, lng: location.lng })
      setSearchedState(location.stateAbbr || null) // Store the state from ZIP lookup
      
      console.log(`🌍 Location: ${location.city}, ${location.stateAbbr} (${location.lat}, ${location.lng})`)
      
      // 2. Fetch all tiers in parallel
      console.log('📡 Fetching Federal:', '/.netlify/functions/congress-meetings')
      console.log('📡 Fetching State:', location.stateAbbr ? `/.netlify/functions/state-events?state=${location.stateAbbr}` : 'SKIPPED')
      console.log('📡 Fetching Local:', `/.netlify/functions/local-meetings?lat=${location.lat}&lng=${location.lng}&radius=${radius}`)
      
      // Create abort controller for 30-second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      // Use cache: 'default' to enable browser caching
      // Add timestamp to bust cache for state events (they update frequently)
      const cacheBuster = `&_t=${Date.now()}`;
      const fetchOptions: RequestInit = { 
        signal: controller.signal,
        cache: 'default'
      };
      
      console.time('⏱️ Total fetch time');
      const [federalResponse, stateResponse, localResponse] = await Promise.all([
        fetch(getApiUrl(`/.netlify/functions/congress-meetings`), fetchOptions),
        location.stateAbbr 
          ? fetch(getApiUrl(`/.netlify/functions/state-events?state=${location.stateAbbr}${cacheBuster}`), fetchOptions)
          : Promise.resolve(null),
        fetch(getApiUrl(`/.netlify/functions/local-meetings?lat=${location.lat}&lng=${location.lng}&radius=${radius}${cacheBuster}`), fetchOptions)
      ]);
      console.timeEnd('⏱️ Total fetch time');
      
      clearTimeout(timeoutId);
      
      // Parse federal events
      let federal: LegislativeEvent[] = []
      if (federalResponse.ok) {
        const federalText = await federalResponse.text()
        console.log('📥 Federal raw response:', federalText.substring(0, 200))
        federal = JSON.parse(federalText)
        console.log(`🏛️ Federal: ${federal.length} events`, federal.length > 0 ? federal[0] : 'none')
      } else {
        console.error('❌ Federal API error:', federalResponse.status, await federalResponse.text())
      }
      
      // Parse state events
      let state: LegislativeEvent[] = []
      if (stateResponse && stateResponse.ok) {
        const stateText = await stateResponse.text()
        console.log('📥 State raw response:', stateText.substring(0, 200))
        state = JSON.parse(stateText)
        console.log(`🏢 State: ${state.length} events`, state.length > 0 ? state[0] : 'none')
        
        // Extract calendar sources from headers
        const calendarSourcesHeader = stateResponse.headers.get('X-Calendar-Sources')
        if (calendarSourcesHeader) {
          try {
            const sources = JSON.parse(calendarSourcesHeader)
            setCalendarSources(sources)
            console.log('📅 Calendar sources:', sources)
          } catch (e) {
            console.warn('Failed to parse calendar sources:', e)
          }
        }
        
        // Debug: Check bills field
        const eventsWithBills = state.filter(e => e.bills && e.bills.length > 0)
        console.log(`📋 Events with bills: ${eventsWithBills.length}`)
        if (eventsWithBills.length > 0) {
          console.log(`📋 Sample event with bills:`, eventsWithBills[0].name, 'Bills:', eventsWithBills[0].bills)
        }
        
        // Show enrichment message if events have detail URLs
        const eventsWithDetails = state.filter(e => e.url).length
        if (eventsWithDetails > 0) {
          console.log(`ℹ️ Note: ${eventsWithDetails} events are being enriched with docket/Zoom data in the background. Refresh in a few minutes for full details.`)
        }
      } else if (stateResponse) {
        console.error('❌ State API error:', stateResponse.status, await stateResponse.text())
      }
      
      // Parse local events
      let local: LegislativeEvent[] = []
      if (localResponse.ok) {
        const localText = await localResponse.text()
        console.log('📥 Local raw response:', localText.substring(0, 200))
        local = JSON.parse(localText)
        console.log(`🏘️ Local: ${local.length} events`, local.length > 0 ? local[0] : 'none')
      } else {
        console.error('❌ Local API error:', localResponse.status, await localResponse.text())
      }
      
      // Calculate distances and add tags for all events
      const addDistanceAndTags = (events: LegislativeEvent[]) => 
        events.map(event => ({
          ...event,
          tags: autoTagEvent(event),
          distance: calculateDistance(location.lat, location.lng, event.lat, event.lng)
        })).sort((a, b) => a.distance - b.distance);
      
      const federalWithDistance = addDistanceAndTags(federal).filter(e => e.distance <= radius)
      // State events are NOT filtered by distance - they're statewide events
      const stateWithDistance = addDistanceAndTags(state)
      const localWithDistance = addDistanceAndTags(local).filter(e => e.distance <= radius)
      
      setFederalEvents(federalWithDistance)
      setStateEvents(stateWithDistance)
      setLocalEvents(localWithDistance)
      
      const totalEvents = federalWithDistance.length + stateWithDistance.length + localWithDistance.length
      
      if (totalEvents === 0) {
        const allEvents = [...addDistanceAndTags(federal), ...addDistanceAndTags(state), ...addDistanceAndTags(local)]
        if (allEvents.length > 0) {
          const closest = allEvents.sort((a, b) => a.distance - b.distance)[0]
          setError(`No events found within ${radius} miles. The nearest event is ${closest.distance.toFixed(0)} miles away in ${closest.location}. Try increasing your search radius to ${Math.ceil(closest.distance / 50) * 50} miles or more.`)
        } else {
          setError(`No upcoming legislative events found. Legislatures may be in recess, or there may be no scheduled public meetings at this time.`)
        }
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while searching for events')
      console.error('Search error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStateSelect = (stateCode: string) => {
    if (stateCode === '') {
      // Clear filter
      setSelectedState(null)
    } else {
      // Set filter
      setSelectedState(stateCode)
    }
  }

  return (
    <div className="app">
      <StateSidebar 
        selectedState={selectedState || undefined}
        onStateSelect={handleStateSelect}
      />
      
      <header className="header">
        <h1>🏛️ Civitron</h1>
        <p className="tagline">Discover upcoming legislative events near you - Federal, State, and Local</p>
      </header>

      <main className="main">
        <StateSelector
          selectedState={selectedState}
          onSelectState={async (stateAbbr) => {
            setSelectedState(stateAbbr)
            
            // Get capitol location for this state
            const capitol = STATE_CAPITOLS[stateAbbr]
            if (!capitol) {
              setError(`No data available for ${stateAbbr} yet`)
              return
            }
            
            // Update ZIP and fetch events with expanded radius for entire state
            setZipCode(capitol.zip)
            setRadius(500)  // Expand to 500 miles to cover entire state
            setLoading(true)
            setError(null)
            setCalendarSources([]) // Reset calendar sources
            setIsStateSearch(true)
            setUserLocation({ lat: capitol.lat, lng: capitol.lng })
            setSearchedState(stateAbbr) // Set the searched state
            
            try {
              // Create abort controller for 30-second timeout
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 30000);
              const fetchOptions: RequestInit = { 
                signal: controller.signal,
                cache: 'default'
              };
              
              console.time('⏱️ State selector fetch time');
              const stateCacheBuster = `&_t=${Date.now()}`;
              
              console.log('🚀 Fetching federal events...');
              console.log('🚀 Fetching state events:', `state-events?state=${stateAbbr}`);
              console.log('🚀 Fetching local events:', `local-meetings?lat=${capitol.lat}&lng=${capitol.lng}&radius=${radius}`);
              
              const [federalResponse, stateResponse, localResponse] = await Promise.all([
                fetch(getApiUrl(`/.netlify/functions/congress-meetings`), fetchOptions),
                fetch(getApiUrl(`/.netlify/functions/state-events?state=${stateAbbr}${stateCacheBuster}`), fetchOptions),
                fetch(getApiUrl(`/.netlify/functions/local-meetings?lat=${capitol.lat}&lng=${capitol.lng}&radius=${radius}${stateCacheBuster}`), fetchOptions)
              ]);
              console.timeEnd('⏱️ State selector fetch time');
              
              console.log('📡 Response status - Federal:', federalResponse.status, 'State:', stateResponse.status, 'Local:', localResponse.status);
              
              clearTimeout(timeoutId);
              
              const federal = federalResponse.ok ? await federalResponse.json() : []
              const state = stateResponse.ok ? await stateResponse.json() : []
              const local = localResponse.ok ? await localResponse.json() : []
              
              // Extract calendar sources from state response headers
              if (stateResponse.ok) {
                const calendarSourcesHeader = stateResponse.headers.get('X-Calendar-Sources')
                if (calendarSourcesHeader) {
                  try {
                    const sources = JSON.parse(calendarSourcesHeader)
                    setCalendarSources(sources)
                    console.log('📅 Calendar sources:', sources)
                  } catch (e) {
                    console.warn('Failed to parse calendar sources:', e)
                  }
                }
              }
              
              // Filter out malformed events missing required fields
              const validFederal = federal.filter((e: any) => e && e.level)
              const validState = state.filter((e: any) => e && e.level)
              const validLocal = local.filter((e: any) => e && e.level)
              
              console.log('📊 Parsed results - Federal:', validFederal.length, 'State:', validState.length, 'Local:', validLocal.length);
              
              // Add distances and tags
              const addDistanceAndTags = (events: LegislativeEvent[]) => {
                return events.filter(e => e && e.level).map(event => ({
                  ...event,
                  tags: autoTagEvent(event),
                  distance: calculateDistance(capitol.lat, capitol.lng, event.lat, event.lng)
                }))
              }
              
              setFederalEvents(addDistanceAndTags(validFederal).filter(e => e.distance <= radius))
              // State events are NOT filtered by distance - they're statewide events
              setStateEvents(addDistanceAndTags(validState))
              // Local events: no distance filter for state searches (show all in state)
              setLocalEvents(addDistanceAndTags(validLocal))
              
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Failed to fetch state events')
            } finally {
              setLoading(false)
            }
          }}
        />

        <form onSubmit={handleSearch} className="search-form">
          <div className="form-group">
            <label htmlFor="zipCode">ZIP Code</label>
            <input
              id="zipCode"
              type="text"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
              placeholder="Enter 5-digit ZIP code"
              maxLength={5}
              className="input"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="radius">
              Radius: <strong>{radius} miles</strong>
              {isStateSearch && <span style={{color: '#10b981', marginLeft: '8px'}}>(Statewide)</span>}
            </label>
            <input
              id="radius"
              type="range"
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value))}
              min="10"
              max="500"
              step="10"
              className="slider"
              disabled={loading}
            />
            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#9ca3af', marginTop: '4px'}}>
              <span>10 mi</span>
              <span>250 mi</span>
              <span>500 mi</span>
            </div>
          </div>

          <button type="submit" className="search-button" disabled={loading}>
            {loading ? 'Searching...' : 'Search Events'}
          </button>
        </form>

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Show source links when we have searched (regardless of results) */}
        {userLocation && (
          <SourceLinks
            federalEvents={federalEvents}
            stateEvents={stateEvents}
            localEvents={localEvents}
            selectedState={selectedState || searchedState || undefined}
            searchedState={searchedState || undefined}
            calendarSources={calendarSources}
          />
        )}

        {/* Show "no results" message when search completed but found nothing */}
        {!loading && !error && userLocation && 
         federalEvents.length === 0 && stateEvents.length === 0 && localEvents.length === 0 && (
          <div className="empty-results">
            <div className="empty-results-icon">🔍</div>
            <h3>No Events Found</h3>
            <p>
              {selectedState 
                ? `No upcoming legislative events found for ${selectedState}.`
                : `No upcoming legislative events found within ${radius} miles of ZIP ${zipCode}.`
              }
            </p>
            <div className="empty-results-tips">
              <h4>Suggestions:</h4>
              <ul>
                <li>The legislature may not be in session currently</li>
                <li>Try selecting a different state from the sidebar</li>
                <li>Check back during the regular legislative session (typically January-May)</li>
                <li>Expand your search to include more states</li>
              </ul>
            </div>
          </div>
        )}

        {(federalEvents.length > 0 || stateEvents.length > 0 || localEvents.length > 0) && userLocation && (
          <div className="results">
            <h2 className="results-title">
              {federalEvents.length + stateEvents.length + localEvents.length} Total Events Found
            </h2>
            
            {/* Show enrichment notice for state events */}
            <EnrichmentNotice 
              eventsCount={stateEvents.length}
              enrichableCount={stateEvents.filter(e => e.url && (!e.docketUrl || !e.bills)).length}
            />
            
            <TagFilter
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
            />
            
            <TabbedEvents
              federalEvents={federalEvents}
              stateEvents={stateEvents}
              localEvents={localEvents}
              centerLat={userLocation.lat}
              centerLng={userLocation.lng}
              radius={radius}
              selectedTags={selectedTags}
              selectedState={selectedState || undefined}
            />
          </div>
        )}

        {!loading && !error && federalEvents.length === 0 && stateEvents.length === 0 && localEvents.length === 0 && !userLocation && (
          <div className="empty-state">
            <p>Enter a ZIP code to find legislative events near you</p>
            <p className="empty-state-hint">
              Real-time data from Congress.gov, OpenStates, and Legistar APIs
            </p>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>
          Data sources: <a href="https://api.congress.gov" target="_blank" rel="noopener noreferrer">Congress.gov</a>
          {' '}&bull;{' '}
          <a href="https://docs.openstates.org" target="_blank" rel="noopener noreferrer">OpenStates</a>
          {' '}&bull;{' '}
          <a href="https://webapi.legistar.com" target="_blank" rel="noopener noreferrer">Legistar</a>
        </p>
      </footer>
    </div>
  )
}

export default App
