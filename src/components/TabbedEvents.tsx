import { useState } from 'react';
import type { LegislativeEvent } from '../types/event';
import EventMap from './EventMap';
import { SourceLinks } from './SourceLinks';
import { TAG_DEFINITIONS } from '../utils/tagging';

interface TabbedEventsProps {
  federalEvents: LegislativeEvent[];
  stateEvents: LegislativeEvent[];
  localEvents: LegislativeEvent[];
  centerLat: number;
  centerLng: number;
  radius: number;
  selectedTags?: string[];
  selectedState?: string;
  viewMode: 'list' | 'map';
  onViewModeChange: (mode: 'list' | 'map') => void;
  calendarSources?: any[];
  searchedState?: string;
}

type TabType = 'all' | 'state' | 'local';

export default function TabbedEvents({
  federalEvents,
  stateEvents,
  localEvents,
  centerLat,
  centerLng,
  radius,
  selectedTags = [],
  selectedState,
  viewMode,
  onViewModeChange,
  calendarSources = [],
  searchedState
}: TabbedEventsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [cardLayout, setCardLayout] = useState<'compact' | 'detailed'>('compact');
  const [showSources, setShowSources] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<LegislativeEvent | null>(null);

  // Filter events by selected state (if any)
  const filterByState = (events: LegislativeEvent[]) => {
    if (!selectedState) return events;
    const filtered = events.filter(e => e.state === selectedState);
    if (events.length > 0 && filtered.length !== events.length) {
      console.log('🔍 State filter:', { 
        selectedState, 
        beforeFilter: events.length, 
        afterFilter: filtered.length,
        firstEventState: events[0]?.state,
        sample: events.slice(0, 2).map(e => ({ name: e.name, state: e.state }))
      });
    }
    return filtered;
  };

  // Filter events by selected tags
  const filterByTags = (events: LegislativeEvent[]) =>
    selectedTags.length === 0 
      ? events 
      : events.filter(e => e.tags?.some(t => selectedTags.includes(t)));

  const filteredFederal = filterByTags(filterByState(federalEvents));
  const filteredState = filterByTags(filterByState(stateEvents));
  const filteredLocal = filterByTags(filterByState(localEvents));

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

        {/* Layout Toggle Above Events List */}
        {(activeEvents.length > 0 || calendarSources.length > 0) && (
          <div className="events-header">
            <h3 className="events-count">{activeEvents.length} Events</h3>
            <div className="events-controls">
              {activeEvents.length > 0 && (
                <div className="layout-toggle">
                  <button
                    className={`layout-button ${cardLayout === 'compact' ? 'active' : ''}`}
                    onClick={() => setCardLayout('compact')}
                    title="Compact cards"
                  >
                    ⊞ Grid
                  </button>
                  <button
                    className={`layout-button ${cardLayout === 'detailed' ? 'active' : ''}`}
                    onClick={() => setCardLayout('detailed')}
                    title="Detailed view"
                  >
                    ☰ List
                  </button>
                </div>
              )}
              {calendarSources.length > 0 && (
                <button
                  className="sources-button"
                  onClick={() => setShowSources(!showSources)}
                  title="View data sources"
                >
                  📁 Sources
                </button>
              )}
            </div>
          </div>
        )}

        {/* Sources Modal */}
        {showSources && (
          <div className="sources-modal-overlay" onClick={() => setShowSources(false)}>
            <div className="sources-modal" onClick={(e) => e.stopPropagation()}>
              <div className="sources-modal-header">
                <h3>Data Sources</h3>
                <button className="sources-modal-close" onClick={() => setShowSources(false)}>
                  ×
                </button>
              </div>
              <div className="sources-modal-content">
                <SourceLinks
                  federalEvents={federalEvents}
                  stateEvents={stateEvents}
                  localEvents={localEvents}
                  selectedState={selectedState}
                  searchedState={searchedState}
                  calendarSources={calendarSources}
                  simpleMode={true}
                />
              </div>
            </div>
          </div>
        )}

        {/* Events List Below Map */}
        {activeEvents.length > 0 ? (
          <div className={`events-list events-list-${cardLayout}`}>
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

                  {event.description && (
                    <div className="event-detail">
                      <span className="detail-label">📄 Description:</span>
                      <span className="detail-value">{event.description}</span>
                    </div>
                  )}

                  {event.docketUrl && (
                    <div className="event-detail">
                      <span className="detail-label">📋 Agenda:</span>
                      <span className="detail-value">
                        <a href={event.docketUrl} target="_blank" rel="noopener noreferrer" className="docket-link">
                          View Agenda PDF
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

                  {(event.sourceUrl || event.url) && (
                    <div className="event-detail">
                      <span className="detail-label">🔗 Source:</span>
                      <span className="detail-value">
                        <a href={(event.sourceUrl || event.url) ?? ''} target="_blank" rel="noopener noreferrer" className="source-link">
                          View Details
                        </a>
                      </span>
                    </div>
                  )}

                  {event.bills && event.bills.length > 0 && (
                    <div className="event-detail bills-section">
                      <span className="detail-label">📋 Bills ({event.bills.length}):</span>
                      <div className="bills-list">
                        {event.bills.slice(0, 3).map((bill, idx) => (
                          <div key={idx} className="bill-item">
                            <div className="bill-header">
                              {bill.url ? (
                                <a href={bill.url} target="_blank" rel="noopener noreferrer" className="bill-link">
                                  {bill.id || bill.number}
                                </a>
                              ) : (
                                <span className="bill-number">{bill.id || bill.number}</span>
                              )}
                            </div>
                            <p className="bill-title">{bill.title}</p>
                            {bill.summary && (
                              <p className="bill-summary-preview">
                                {bill.summary.length > 100 ? `${bill.summary.substring(0, 100)}...` : bill.summary}
                              </p>
                            )}
                          </div>
                        ))}
                        {event.bills.length > 3 && (
                          <p className="more-bills">+{event.bills.length - 3} more bills</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <button 
                  className="view-details-btn-card"
                  onClick={() => setSelectedEvent(event)}
                >
                  View Full Details
                </button>
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
      
      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedEvent.name}</h2>
              <button className="modal-close" onClick={() => setSelectedEvent(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="detail-section">
                <h3>📅 Date & Time</h3>
                <p>{formatDate(selectedEvent.date)}{selectedEvent.time && ` at ${selectedEvent.time}`}</p>
              </div>
              
              {selectedEvent.committee && (
                <div className="detail-section">
                  <h3>🏛️ Committee</h3>
                  <p>{selectedEvent.committee}</p>
                </div>
              )}
              
              {selectedEvent.location && (
                <div className="detail-section">
                  <h3>📍 Location</h3>
                  <p>{selectedEvent.location}</p>
                  {selectedEvent.city && selectedEvent.state && (
                    <p className="city-state">{selectedEvent.city}, {selectedEvent.state}</p>
                  )}
                </div>
              )}
              
              <div className="detail-section">
                <h3>📊 Details</h3>
                <p><strong>Level:</strong> {selectedEvent.level}</p>
                {selectedEvent.type && <p><strong>Type:</strong> {selectedEvent.type}</p>}
                {selectedEvent.distance !== undefined && (
                  <p><strong>Distance:</strong> {selectedEvent.distance.toFixed(1)} miles</p>
                )}
              </div>
              
              {selectedEvent.description && (
                <div className="detail-section">
                  <h3>📄 Description</h3>
                  <p className="event-description-full">{selectedEvent.description}</p>
                </div>
              )}
              
              {selectedEvent.bills && selectedEvent.bills.length > 0 && (
                <div className="detail-section">
                  <h3>📋 Bills ({selectedEvent.bills.length})</h3>
                  <div className="bills-detail-list">
                    {selectedEvent.bills.map((bill, i) => (
                      <div key={i} className="bill-detail-item">
                        <div className="bill-detail-header">
                          <strong>{bill.id || bill.number}</strong>
                          {bill.url && (
                            <a href={bill.url} target="_blank" rel="noopener noreferrer" className="bill-link-btn">
                              View Bill →
                            </a>
                          )}
                        </div>
                        <p className="bill-title">{bill.title}</p>
                        {bill.summary && (
                          <div className="bill-summary-detail">
                            <strong>AI Summary:</strong>
                            <p>{bill.summary}</p>
                          </div>
                        )}
                        {bill.tags && bill.tags.length > 0 && (
                          <div className="bill-tags-detail">
                            {bill.tags.map((tag, tagIdx) => (
                              <span key={tagIdx} className="bill-tag">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedEvent.tags && selectedEvent.tags.length > 0 && (
                <div className="detail-section">
                  <h3>🏷️ Tags</h3>
                  <div className="tags-list">
                    {selectedEvent.tags.map((tagId, i) => {
                      const tag = TAG_DEFINITIONS[tagId];
                      return tag ? (
                        <span key={i} className="tag" style={{ backgroundColor: tag.color + '20', color: tag.color, border: `1px solid ${tag.color}` }}>
                          {tag.icon} {tag.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
              
              <div className="detail-section">
                <h3>🔗 Links</h3>
                <div className="links-grid">
                  {(selectedEvent.sourceUrl || selectedEvent.url) && (
                    <a href={(selectedEvent.sourceUrl || selectedEvent.url) ?? ''} target="_blank" rel="noopener noreferrer" className="detail-link">
                      📄 Event Details
                    </a>
                  )}
                  {selectedEvent.docketUrl && (
                    <a href={selectedEvent.docketUrl} target="_blank" rel="noopener noreferrer" className="detail-link">
                      📋 Agenda PDF
                    </a>
                  )}
                  {selectedEvent.virtualMeetingUrl && (
                    <a href={selectedEvent.virtualMeetingUrl} target="_blank" rel="noopener noreferrer" className="detail-link">
                      🎥 Virtual Meeting
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
