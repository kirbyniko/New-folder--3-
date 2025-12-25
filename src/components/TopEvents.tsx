import { useState, useEffect } from 'react';
import type { LegislativeEvent } from '../types/event';
import './TopEvents.css';

interface TopEventsData {
  events: LegislativeEvent[];
  count: number;
  lastUpdated: string;
  prioritization: string;
  cached?: boolean;
  stale?: boolean;
  cacheAgeMinutes?: number;
}

interface TopEventsProps {
  searchMapComponent?: React.ReactNode;
}

type TabType = 'top-events' | 'search-map';

export default function TopEvents({ searchMapComponent }: TopEventsProps) {
  const [topEvents, setTopEvents] = useState<LegislativeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<Partial<TopEventsData>>({});
  const [activeTab, setActiveTab] = useState<TabType>('top-events');

  useEffect(() => {
    fetchTopEvents();
  }, []);

  const fetchTopEvents = async () => {
    try {
      setLoading(true);
      
      // Use relative URL - works on any port (Netlify dev proxies everything)
      const response = await fetch('/api/top-events');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch top events: ${response.status}`);
      }

      const data: TopEventsData = await response.json();
      setTopEvents(data.events);
      setMetadata({
        count: data.count,
        lastUpdated: data.lastUpdated,
        cached: data.cached,
        cacheAgeMinutes: data.cacheAgeMinutes
      });
      setError(null);
    } catch (err: any) {
      console.error('Error fetching top events:', err);
      setError(err.message);
      setTopEvents([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="top-events-container">
        <div className="top-events-header">
          <h2>🔥 Top Upcoming Events</h2>
          <p className="subtitle">Loading prioritized events...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="top-events-container">
        <div className="top-events-header">
          <h2>🔥 Top Upcoming Events</h2>
          <p className="error-message">{error}</p>
        </div>
      </div>
    );
  }

  if (topEvents.length === 0) {
    return (
      <div className="top-events-container">
        <div className="top-events-header">
          <h2>🔥 Top Upcoming Events</h2>
          <p className="no-events">No upcoming events scheduled</p>
        </div>
      </div>
    );
  }

  // Count events by priority type
  const withBills = topEvents.filter(e => e.bills && e.bills.length > 0).length;
  const withParticipation = topEvents.filter(e => (e as any).allowsPublicParticipation).length;
  const withTags = topEvents.filter(e => e.tags && e.tags.length > 0).length;

  return (
    <div className="top-events-container">
      <div className="top-events-header">
        <h2>🔥 Top {topEvents.length} Upcoming Events</h2>
        
        {/* Tab Navigation */}
        <div className="top-events-tabs">
          <button
            className={`top-event-tab ${activeTab === 'top-events' ? 'active' : ''}`}
            onClick={() => setActiveTab('top-events')}
          >
            📋 Top Events
          </button>
          <button
            className={`top-event-tab ${activeTab === 'search-map' ? 'active' : ''}`}
            onClick={() => setActiveTab('search-map')}
          >
            🗺️ Search Map
          </button>
        </div>
        
        <div className="priority-stats">
          <span className="stat-badge bills">{withBills} with bills</span>
          <span className="stat-badge participation">{withParticipation} public participation</span>
          <span className="stat-badge tags">{withTags} tagged</span>
        </div>
        {metadata.cached && (
          <p className="cache-info">
            Cached • Updated {metadata.cacheAgeMinutes}m ago
          </p>
        )}
      </div>

      {activeTab === 'top-events' ? (
        <div className="top-events-grid">
          {topEvents.map((event, index) => (
            <div key={event.id || index} className="top-event-card">
              <div className="event-rank">#{index + 1}</div>
              
              <div className="event-priority-badges">
                {event.bills && event.bills.length > 0 && (
                  <span className="priority-badge bills" title={`${event.bills.length} bill(s)`}>
                    📄 {event.bills.length}
                  </span>
                )}
                {(event as any).allowsPublicParticipation && (
                  <span className="priority-badge participation" title="Public participation allowed">
                    👥
                  </span>
                )}
                {event.tags && event.tags.length > 0 && (
                  <span className="priority-badge tags" title={event.tags.join(', ')}>
                    🏷️ {event.tags.length}
                  </span>
                )}
              </div>

              <h3 className="event-name">{event.name}</h3>
              
              <div className="event-details">
                {event.date && (
                  <div className="event-date">
                    📅 {new Date(event.date).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                )}
                <div className="event-time">
                  🕐 {event.time || 'Time TBD'}
                </div>
                {event.location && (
                  <div className="event-location">
                    📍 {event.location}
                  </div>
                )}
                {event.committee && (
                  <div className="event-committee">
                    🏛️ {event.committee}
                  </div>
                )}
              </div>

              {event.bills && event.bills.length > 0 && (
                <div className="event-bills">
                  <strong>Bills:</strong>
                  <ul>
                    {event.bills.slice(0, 3).map((bill, i) => (
                      <li key={i}>
                        {bill.url ? (
                          <a href={bill.url} target="_blank" rel="noopener noreferrer">
                            {bill.number}
                          </a>
                        ) : (
                          bill.number
                        )}
                        {bill.title && ` - ${bill.title.slice(0, 50)}...`}
                      </li>
                    ))}
                    {event.bills.length > 3 && (
                      <li className="more-bills">+{event.bills.length - 3} more</li>
                    )}
                  </ul>
                </div>
              )}

              {event.tags && event.tags.length > 0 && (
                <div className="event-tags">
                  {event.tags.slice(0, 3).map((tag, i) => (
                    <span key={i} className="tag">{tag}</span>
                  ))}
                  {event.tags.length > 3 && (
                    <span className="tag more">+{event.tags.length - 3}</span>
                  )}
                </div>
              )}

              {event.detailsUrl && (
                <a 
                  href={event.detailsUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="event-link"
                >
                  View Details →
                </a>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="search-map-tab">
          {searchMapComponent || (
            <div className="empty-state" style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
              <p>Search for events by ZIP code to see the map</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
