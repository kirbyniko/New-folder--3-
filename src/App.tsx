import { useState, useEffect, useRef } from 'react'
import { geocodeZipCode, calculateDistance } from './utils/geocoding'
import type { LegislativeEvent } from './types/event'
import TabbedEvents from './components/TabbedEvents'
import { EnrichmentNotice } from './components/EnrichmentNotice'
import Navbar from './components/Navbar'
import TopEventsList from './components/TopEventsList'
import DataViewer from './components/DataViewer'
import FilterBar from './components/FilterBar'
import { SourceLinks } from './components/SourceLinks'
import { getApiUrl } from './config/api'
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
  const [showAdmin, setShowAdmin] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const [zipCode, setZipCode] = useState('')
  const [radius, setRadius] = useState(50)
  const [selectedState, setSelectedState] = useState<string | null>(null)
  const [searchedState, setSearchedState] = useState<string | null>(null) // State from ZIP code search
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [federalEvents, setFederalEvents] = useState<LegislativeEvent[]>([])
  const [stateEvents, setStateEvents] = useState<LegislativeEvent[]>([])
  const [localEvents, setLocalEvents] = useState<LegislativeEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [calendarSources, setCalendarSources] = useState<any[]>([])
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isStateSearch, setIsStateSearch] = useState(false)
  const isStateSearchRef = useRef(false) // Ref for async callbacks to check current value
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Auto-detect user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          console.log('📍 Got location:', latitude, longitude)
          
          // Don't override if user has already selected a state
          if (isStateSearchRef.current) {
            console.log('⏸️ Skipping auto-location - state already selected')
            return
          }
          
          try {
            // Reverse geocode to get ZIP code
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
              {
                headers: {
                  'User-Agent': 'CivicPulse/1.0'
                }
              }
            )
            const data = await response.json()
            console.log('🗺️ Nominatim response:', data)
            const zip = data.address?.postcode
            console.log('📮 Reverse geocoded ZIP:', zip)
            
            if (zip && /^\d{5}/.test(zip)) {
              // Extract first 5 digits
              const detectedZip = zip.slice(0, 5)
              
              // Check again before proceeding - user might have selected state during geocoding
              if (isStateSearchRef.current) {
                console.log('⏸️ State selected during geocoding - aborting auto-search')
                return
              }
              
              setZipCode(detectedZip)
              console.log('✅ Set ZIP code:', detectedZip)
              // Trigger search after state updates
              setTimeout(() => {
                if (!isStateSearchRef.current) {
                  console.log('🔍 Auto-triggering search...')
                  performSearch(detectedZip)
                }
              }, 200)
            } else {
              // No ZIP from reverse geocode - use forward geocoding with city/state
              console.log('⚠️ No ZIP from reverse geocode, trying city search...')
              const city = data.address?.city || data.address?.town || data.address?.village
              const state = data.address?.state
              
              if (city && state) {
                console.log(`🏙️ Detected: ${city}, ${state}`)
                // Try to geocode city to get ZIP
                try {
                  const cityResponse = await fetch(
                    `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}&country=USA&format=json&limit=1`,
                    {
                      headers: {
                        'User-Agent': 'CivicPulse/1.0'
                      }
                    }
                  )
                  const cityData = await cityResponse.json()
                  console.log('🏙️ City search response:', cityData)
                  
                  if (cityData.length > 0 && cityData[0].display_name) {
                    // Try to extract ZIP from display name
                    const zipMatch = cityData[0].display_name.match(/\b(\d{5})\b/)
                    if (zipMatch) {
                      // Check again before proceeding
                      if (isStateSearchRef.current) {
                        console.log('⏸️ State selected during city search - aborting')
                        return
                      }
                      
                      const detectedZip = zipMatch[1]
                      setZipCode(detectedZip)
                      console.log('✅ Set ZIP code from city:', detectedZip)
                      setTimeout(() => {
                        if (!isStateSearchRef.current) {
                          performSearch(detectedZip)
                        }
                      }, 100)
                      return
                    }
                  }
                } catch (cityErr) {
                  console.log('City search failed:', cityErr)
                }
              }
              
              // Last resort: use coordinates directly
              console.log('⚠️ Could not get ZIP, using coordinates for search')
              setUserLocation({ lat: latitude, lng: longitude })
            }
          } catch (err) {
            console.log('Could not determine ZIP from location:', err)
          }
        },
        (error) => {
          console.log('Location detection denied or unavailable:', error.message)
          // Fallback: Use DC as default (most central for federal events)
          const fallbackZip = '20001' // Washington DC
          setZipCode(fallbackZip)
          console.log('Using fallback ZIP:', fallbackZip)
        },
        { timeout: 10000 }
      )
    } else {
      // Browser doesn't support geolocation - use DC fallback
      setZipCode('20001')
    }
  }, [])

  const performSearch = async (searchZip: string) => {
    if (!searchZip || searchZip.length !== 5) {
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
    isStateSearchRef.current = false // Reset ref for async callbacks
    setSidebarCollapsed(true) // Auto-collapse on ZIP search

    try {
      // 1. Geocode ZIP code
      const location = await geocodeZipCode(searchZip)
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
      
      // Cache buster to prevent stale data
      const cacheBuster = `&_t=${Date.now()}`;
      
      // Use cache: 'default' to enable browser caching AND backend caching
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
        
        // Extract local calendar sources
        const localCalendarSourcesHeader = localResponse.headers.get('X-Calendar-Sources')
        if (localCalendarSourcesHeader) {
          try {
            const localSources = JSON.parse(localCalendarSourcesHeader)
            if (localSources.length > 0) {
              // Merge with existing calendar sources (avoid duplicates)
              const existingUrls = new Set(calendarSources.map((s: any) => s.url))
              const newSources = localSources.filter((s: any) => !existingUrls.has(s.url))
              if (newSources.length > 0) {
                setCalendarSources([...calendarSources, ...newSources])
                console.log('📅 Added local calendar sources:', newSources)
              }
            }
          } catch (e) {
            console.warn('Failed to parse local calendar sources:', e)
          }
        }
      } else {
        console.error('❌ Local API error:', localResponse.status, await localResponse.text())
      }
      
      // Calculate distances - tags now come from database via blobs
      const addDistance = (events: LegislativeEvent[]) => 
        events.map(event => ({
          ...event,
          distance: calculateDistance(location.lat, location.lng, event.lat, event.lng)
        })).sort((a, b) => a.distance - b.distance);
      
      const federalWithDistance = addDistance(federal).filter(e => e.distance <= radius)
      // State events are NOT filtered by distance - they're statewide events
      const stateWithDistance = addDistance(state)
      const localWithDistance = addDistance(local).filter(e => e.distance <= radius)
      
      setFederalEvents(federalWithDistance)
      setStateEvents(stateWithDistance)
      setLocalEvents(localWithDistance)
      
      const totalEvents = federalWithDistance.length + stateWithDistance.length + localWithDistance.length
      
      if (totalEvents === 0) {
        const allEvents = [...addDistance(federal), ...addDistance(state), ...addDistance(local)]
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    await performSearch(zipCode)
  }

  const handleStateSelect = async (stateAbbr: string) => {
    if (stateAbbr === '') {
      // Clear filter
      setSelectedState(null)
      return
    }
    
    setSelectedState(stateAbbr)
    
    // Get capitol location for this state
    const capitol = STATE_CAPITOLS[stateAbbr]
    if (!capitol) {
      setError(`No data available for ${stateAbbr} yet`)
      return
    }
    
    // Update ZIP and fetch events with expanded radius for entire state
    setZipCode(capitol.zip)
    const stateRadius = 500;  // Use 500 miles to cover entire state
    setRadius(stateRadius)
    setLoading(true)
    setError(null)
    setCalendarSources([]) // Reset calendar sources
    setIsStateSearch(true)
    isStateSearchRef.current = true // Update ref for async callbacks
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
      
      const cacheBuster = `&_t=${Date.now()}`;
      
      console.log('🚀 Fetching federal events...');
      console.log('🚀 Fetching state events:', `state-events?state=${stateAbbr}`);
      console.log('🚀 Fetching local events for capital:', `local-meetings?lat=${capitol.lat}&lng=${capitol.lng}&radius=${stateRadius}`);
      
      const [federalResponse, stateResponse, localResponse] = await Promise.all([
        fetch(getApiUrl(`/.netlify/functions/congress-meetings`), fetchOptions),
        fetch(getApiUrl(`/.netlify/functions/state-events?state=${stateAbbr}${cacheBuster}`), fetchOptions),
        fetch(getApiUrl(`/.netlify/functions/local-meetings?lat=${capitol.lat}&lng=${capitol.lng}&radius=${stateRadius}${cacheBuster}`), fetchOptions)
      ]);
      console.timeEnd('⏱️ State selector fetch time');
      
      console.log('📡 Response status - Federal:', federalResponse.status, 'State:', stateResponse.status, 'Local:', localResponse.status);
      
      clearTimeout(timeoutId);
      
      const federal = federalResponse.ok ? await federalResponse.json() : []
      const state = stateResponse.ok ? await stateResponse.json() : []
      const local = localResponse.ok ? await localResponse.json() : []
      
      console.log('📥 Raw responses - Federal:', federal.length, 'State:', state.length, 'Local:', local.length)
      if (local.length > 0) {
        console.log('🏘️ First local event:', local[0])
      }
      
      // Extract and merge calendar sources from both state and local responses
      const allCalendarSources: any[] = [];
      
      // Get state calendar sources
      if (stateResponse.ok) {
        console.log('🔍 All state response headers:', Array.from(stateResponse.headers.entries()))
        const calendarSourcesHeader = stateResponse.headers.get('X-Calendar-Sources')
        console.log('🔍 State response has X-Calendar-Sources header:', !!calendarSourcesHeader)
        if (calendarSourcesHeader) {
          try {
            const sources = JSON.parse(calendarSourcesHeader)
            allCalendarSources.push(...sources)
            console.log('📅 State calendar sources:', sources)
          } catch (e) {
            console.warn('Failed to parse state calendar sources:', e)
          }
        } else {
          console.warn('⚠️ No X-Calendar-Sources header in state response')
        }
      }
      
      // Get local calendar sources and merge (avoiding duplicates)
      // When viewing a specific state, only show local sources from cities IN that state
      if (localResponse.ok) {
        const localCalendarSourcesHeader = localResponse.headers.get('X-Calendar-Sources')
        if (localCalendarSourcesHeader) {
          try {
            const localSources = JSON.parse(localCalendarSourcesHeader)
            if (localSources.length > 0) {
              const existingUrls = new Set(allCalendarSources.map((s: any) => s.url))
              // Filter local sources: only include if they match the selected state
              // Check if local events are actually from this state by looking at the events themselves
              const localEventsFromState = local.filter((e: any) => e.state === stateAbbr)
              
              // Only add local sources if we have local events from this state
              if (localEventsFromState.length > 0) {
                const newSources = localSources.filter((s: any) => !existingUrls.has(s.url))
                if (newSources.length > 0) {
                  allCalendarSources.push(...newSources)
                  console.log(`📅 Local calendar sources from ${stateAbbr}:`, newSources)
                }
              } else {
                console.log(`📅 Skipping local sources - none from ${stateAbbr}`)
              }
            }
          } catch (e) {
            console.warn('Failed to parse local calendar sources:', e)
          }
        }
      }
      
      // Set all calendar sources at once
      console.log('📅 Setting calendar sources, count:', allCalendarSources.length)
      setCalendarSources(allCalendarSources)
      if (allCalendarSources.length > 0) {
        console.log('📅 Total calendar sources:', allCalendarSources.length)
      } else {
        console.warn('⚠️ No calendar sources found in responses')
      }
      
      // Filter out malformed events missing required fields
      const validFederal = federal.filter((e: any) => e && e.level)
      const validState = state.filter((e: any) => e && e.level)
      const validLocal = local.filter((e: any) => e && e.level)
      
      console.log('📊 Valid events - Federal:', validFederal.length, 'State:', validState.length, 'Local:', validLocal.length);
      
      if (local.length !== validLocal.length) {
        console.warn('⚠️ Some local events filtered out:', local.length - validLocal.length, 'missing level field')
      }
      
      // Add distances - tags now come from database via blobs
      const addDistance = (events: LegislativeEvent[]) => {
        return events.filter(e => e && e.level).map(event => ({
          ...event,
          distance: calculateDistance(capitol.lat, capitol.lng, event.lat, event.lng)
        }))
      }
      
      const federalWithDistance = addDistance(validFederal).filter(e => e.distance <= stateRadius)
      const localWithDistance = addDistance(validLocal).filter(e => e.distance <= stateRadius)
      
      console.log('📍 After distance filter (radius:', stateRadius, 'miles) - Federal:', federalWithDistance.length, 'Local:', localWithDistance.length)
      if (validLocal.length > 0 && localWithDistance.length === 0) {
        console.warn('⚠️ All local events filtered by distance! Closest:', Math.min(...validLocal.map(e => calculateDistance(capitol.lat, capitol.lng, e.lat, e.lng))).toFixed(1), 'miles')
      }
      
      setFederalEvents(federalWithDistance)
      // State events are NOT filtered by distance - they're statewide events
      setStateEvents(addDistance(validState))
      // Local events: now fetched for state capital
      setLocalEvents(localWithDistance)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch state events')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <Navbar
        zipCode={zipCode}
        onZipCodeChange={setZipCode}
        onSearch={handleSearch}
        loading={loading}
        onAdminClick={() => setShowAdmin(!showAdmin)}
        showAdmin={showAdmin}
        selectedState={selectedState}
        onStateSelect={handleStateSelect}
      />
      
      {!showAdmin && (
        <div className="filter-bar-wrapper">
          <FilterBar
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
          />
        </div>
      )}

      {showAdmin ? (
        <DataViewer 
          onStateSelect={(state) => {
            setShowAdmin(false);
            setSelectedState(state);
          }}
        />
      ) : (
        <div className="layout">
          {/* Left Column: Top Events List */}
          <div className="events-list-column">
            <TopEventsList 
              isCollapsed={sidebarCollapsed}
              onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
          </div>

          {/* Right Column: Map */}
          <div className="map-column">
            {(federalEvents.length > 0 || stateEvents.length > 0 || localEvents.length > 0) && userLocation ? (
              <>
                {/* Show enrichment notice for state events */}
                <EnrichmentNotice 
                  eventsCount={stateEvents.length}
                  enrichableCount={stateEvents.filter(e => e.url && (!e.docketUrl || !e.bills)).length}
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
                  viewMode="map"
                  onViewModeChange={setViewMode}
                  calendarSources={calendarSources}
                  searchedState={searchedState || undefined}
                />
              </>
            ) : error ? (
              <div className="error-message">
                <strong>Error:</strong> {error}
              </div>
            ) : loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading legislative events...</p>
              </div>
            ) : !loading && userLocation && 
               federalEvents.length === 0 && stateEvents.length === 0 && localEvents.length === 0 ? (
              <div className="empty-results">
                <div className="empty-results-icon">🔍</div>
                <h3>No Events Found</h3>
                <p>
                  {selectedState 
                    ? `No upcoming legislative events found for ${selectedState}.`
                    : `No upcoming legislative events found within ${radius} miles of ZIP ${zipCode}.`
                  }
                </p>
                
                {/* Show data sources at the top */}
                {calendarSources.length > 0 && (
                  <div className="empty-results-sources">
                    <h4>📅 Official Calendar Sources</h4>
                    <SourceLinks 
                      federalEvents={federalEvents}
                      stateEvents={stateEvents}
                      localEvents={localEvents}
                      selectedState={selectedState || undefined}
                      searchedState={searchedState || undefined}
                      calendarSources={calendarSources}
                      simpleMode={true}
                    />
                    <p className="sources-explanation">
                      👆 Click above to verify the official calendar
                    </p>
                  </div>
                )}
                
                <div className="empty-results-tips">
                  <h4>Possible reasons:</h4>
                  <ul>
                    <li><strong>Legislature not in session</strong> - Most state legislatures meet January-May</li>
                    <li><strong>Between sessions</strong> - Check the data sources above to verify the official calendar</li>
                    <li><strong>No meetings scheduled yet</strong> - Committees often schedule meetings 1-2 weeks in advance</li>
                    <li>Try selecting a different state or checking back during the regular session</li>
                  </ul>
                </div>
              </div>
            ) : !loading && !userLocation ? (
              <div className="empty-state">
                <p>Enter a ZIP code to find legislative events near you</p>
                <p className="empty-state-hint">
                  Real-time data from Congress.gov, OpenStates, and Legistar APIs
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )}

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
