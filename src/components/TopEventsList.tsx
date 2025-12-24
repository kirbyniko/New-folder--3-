import { useState, useEffect } from 'react';
import type { LegislativeEvent } from '../types/event';
import './TopEventsList.css';

interface TopEventsData {
  events: LegislativeEvent[];
  count: number;
  lastUpdated: string;
  prioritization: string;
  cached?: boolean;
  stale?: boolean;
  cacheAgeMinutes?: number;
}

interface TopEventsListProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function TopEventsList({ isCollapsed, onToggle }: TopEventsListProps) {
  const [topEvents, setTopEvents] = useState<LegislativeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<Partial<TopEventsData>>({});

  useEffect(() => {
    fetchTopEvents();
  }, []);

  const fetchTopEvents = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/.netlify/functions/top-events');
      
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
      <div className={`top-events-list ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="top-events-list-header">
          <div className="header-top">
            <h2>🔥 Top Upcoming Events</h2>
            <button className="collapse-toggle" onClick={onToggle} title={isCollapsed ? 'Expand' : 'Collapse'}>
              {isCollapsed ? '▶' : '◀'}
            </button>
          </div>
        </div>
        <div className="top-events-list-content">
          <p className="loading-message">Loading events...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`top-events-list ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="top-events-list-header">
          <div className="header-top">
            <h2>🔥 Top Upcoming Events</h2>
            <button className="collapse-toggle" onClick={onToggle} title={isCollapsed ? 'Expand' : 'Collapse'}>
              {isCollapsed ? '▶' : '◀'}
            </button>
          </div>
        </div>
        <div className="top-events-list-content">
          <p className="error-message">{error}</p>
        </div>
      </div>
    );
  }

  const withBills = topEvents.filter(e => e.bills && e.bills.length > 0).length;
  const withParticipation = topEvents.filter(e => (e as any).allowsPublicParticipation).length;
  const withTags = topEvents.filter(e => e.tags && e.tags.length > 0).length;

  return (
    <div className={`top-events-list ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="top-events-list-header">
        <div className="header-top">
          <h2>🔥 Top {topEvents.length} Upcoming Events</h2>
          <button className="collapse-toggle" onClick={onToggle} title={isCollapsed ? 'Expand' : 'Collapse'}>
            {isCollapsed ? '▶' : '◀'}
          </button>
        </div>
        <div className="stats-summary">
          <span className="stat-item">📄 {withBills}</span>
          <span className="stat-item">👥 {withParticipation}</span>
          <span className="stat-item">🏷️ {withTags}</span>
        </div>
      </div>
      
      <div className="top-events-list-content">
        {topEvents.map((event, index) => (
          <div key={event.id || index} className="event-list-item">
            <div className="event-list-rank">#{index + 1}</div>
            
            <div className="event-list-info">
              <h3 className="event-list-name">{event.name}</h3>
              
              <div className="event-list-meta">
                {event.date && (
                  <span className="event-meta-item">
                    📅 {new Date(event.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric'
                    })}
                  </span>
                )}
                <span className="event-meta-item">
                  🕐 {event.time || 'TBD'}
                </span>
                {event.committee && (
                  <span className="event-meta-item">
                    🏛️ {event.committee}
                  </span>
                )}
              </div>

              {event.bills && event.bills.length > 0 && (
                <div className="event-list-bills">
                  <strong>📋 {event.bills.length} Bill{event.bills.length !== 1 ? 's' : ''}</strong>
                </div>
              )}

              {event.tags && event.tags.length > 0 && (
                <div className="event-list-tags">
                  {event.tags.slice(0, 3).map((tag, i) => (
                    <span key={i} className="event-tag-mini">{tag}</span>
                  ))}
                  {event.tags.length > 3 && (
                    <span className="event-tag-mini">+{event.tags.length - 3}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
