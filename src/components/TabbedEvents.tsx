import { useState } from 'react';
import type { LegislativeEvent } from '../types/event';
import EventMap from './EventMap';
import { TAG_DEFINITIONS } from '../utils/tagging';

interface TabbedEventsProps {
  federalEvents: LegislativeEvent[];
  stateEvents: LegislativeEvent[];
  localEvents: LegislativeEvent[];
  centerLat: number;
  centerLng: number;
  radius: number;
  selectedTags?: string[];
}

type TabType = 'all' | 'state' | 'local';

export default function TabbedEvents({
  federalEvents,
  stateEvents,
  localEvents,
  centerLat,
  centerLng,
  radius,
  selectedTags = []
}: TabbedEventsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all');

  // Filter events by selected tags
  const filterByTags = (events: LegislativeEvent[]) =>
    selectedTags.length === 0 
      ? events 
      : events.filter(e => e.tags?.some(t => selectedTags.includes(t)));

  const filteredFederal = filterByTags(federalEvents);
  const filteredState = filterByTags(stateEvents);
  const filteredLocal = filterByTags(localEvents);

  // Combine and deduplicate events (some events may appear in multiple sources)
  const allEventsMap = new Map<string, LegislativeEvent>();
  [...filteredFederal, ...filteredState, ...filteredLocal].forEach(event => {
    // Use a composite key to handle potential duplicates across sources
    const key = `${event.level}-${event.id}`;
    if (!allEventsMap.has(key)) {
      allEventsMap.set(key, event);
    }
  });
  
  const allEvents = Array.from(allEventsMap.values()).sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const tabs = [
    { id: 'all' as TabType, label: '📋 All', events: allEvents, color: '#8b5cf6' },
    { id: 'state' as TabType, label: '🏢 State', events: filteredState, color: '#10b981' },
    { id: 'local' as TabType, label: '🏘️ Local', events: filteredLocal, color: '#f59e0b' }
  ];

  const activeEvents = tabs.find(t => t.id === activeTab)?.events || [];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="tabbed-container">
      {/* Tab Navigation */}
      <div className="tab-nav">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            style={{
              borderBottomColor: activeTab === tab.id ? tab.color : 'transparent'
            }}
          >
            {tab.label}
            <span className="tab-count">{tab.events.length}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Debug Info */}
        <div className="debug-info">
          <strong>🐛 Debug:</strong> {activeEvents.length} events found | 
          Center: {centerLat.toFixed(4)}, {centerLng.toFixed(4)} | 
          Radius: {radius} mi
        </div>

        {/* Map Visualization */}
        {activeEvents.length > 0 && (
          <div className="map-container">
            <EventMap
              key={`${activeTab}-${selectedTags.join(',')}-${activeEvents.length}`}
              events={activeEvents}
              centerLat={centerLat}
              centerLng={centerLng}
              radius={radius}
            />
          </div>
        )}

        {/* Events List */}
        {activeEvents.length > 0 ? (
          <div className="events-list">
            {activeEvents.map((event) => (
              <article key={`${event.level}-${event.id}`} className="event-card">
                <div className="event-header">
                  <span className={`event-badge event-badge-${event.level}`}>
                    {event.level}
                  </span>
                  <span className="event-distance">
                    {event.distance?.toFixed(1)} mi
                  </span>
                </div>
                
                <h3 className="event-name">{event.name}</h3>
                
                {event.tags && event.tags.length > 0 && (
                  <div className="event-tags">
                    {event.tags.map(tagId => {
                      const tag = TAG_DEFINITIONS[tagId];
                      if (!tag) return null;
                      return (
                        <span 
                          key={tagId} 
                          className="event-tag" 
                          style={{ backgroundColor: tag.color }}
                          title={tag.label}
                        >
                          {tag.icon} {tag.label}
                        </span>
                      );
                    })}
                  </div>
                )}
                
                <div className="event-details">
                  <div className="event-detail">
                    <span className="detail-label">📅 Date:</span>
                    <span className="detail-value">{formatDate(event.date)}</span>
                  </div>
                  
                  <div className="event-detail">
                    <span className="detail-label">🕐 Time:</span>
                    <span className="detail-value">{event.time}</span>
                  </div>
                  
                  <div className="event-detail">
                    <span className="detail-label">📍 Location:</span>
                    <span className="detail-value">{event.location}</span>
                  </div>
                  
                  <div className="event-detail">
                    <span className="detail-label">🏛️ Committee:</span>
                    <span className="detail-value">{event.committee}</span>
                  </div>
                  
                  <div className="event-detail">
                    <span className="detail-label">📝 Type:</span>
                    <span className="detail-value">{event.type}</span>
                  </div>

                  {event.city && event.state && (
                    <div className="event-detail">
                      <span className="detail-label">🌆 City:</span>
                      <span className="detail-value">{event.city}, {event.state}</span>
                    </div>
                  )}

                  {event.url && (
                    <div className="event-detail">
                      <span className="detail-label">🔗 Link:</span>
                      <span className="detail-value">
                        <a href={event.url} target="_blank" rel="noopener noreferrer" className="docket-link">
                          View Docket
                        </a>
                      </span>
                    </div>
                  )}

                  {event.virtualMeetingUrl && (
                    <div className="event-detail">
                      <span className="detail-label">🎥 Virtual:</span>
                      <span className="detail-value">
                        <a href={event.virtualMeetingUrl} target="_blank" rel="noopener noreferrer" className="zoom-link">
                          Join Meeting
                        </a>
                      </span>
                    </div>
                  )}

                  {event.sourceUrl && (
                    <div className="event-detail">
                      <span className="detail-label">📰 Source:</span>
                      <span className="detail-value">
                        <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer" className="source-link">
                          View Original Page
                        </a>
                      </span>
                    </div>
                  )}

                  {event.bills && event.bills.length > 0 && (
                    <div className="event-detail bills-section">
                      <span className="detail-label">📋 Bills ({event.bills.length}):</span>
                      <div className="bills-list">
                        {event.bills.map((bill, idx) => (
                          <div key={idx} className="bill-item">
                            <div className="bill-header">
                              <a href={bill.url} target="_blank" rel="noopener noreferrer" className="bill-link">
                                {bill.id}
                              </a>
                              {bill.tags && bill.tags.length > 0 && (
                                <div className="bill-tags">
                                  {bill.tags.map((tag, tagIdx) => (
                                    <span key={tagIdx} className="bill-tag">{tag}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <p className="bill-title">{bill.title}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No {activeTab} events found within {radius} miles</p>
            <p className="empty-state-hint">
              Try increasing your search radius or check other tabs
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
