import { useState, useEffect } from 'react';
import './DataViewer.css';
import { TAG_DEFINITIONS } from '../utils/tagging';
import FilterBar from './FilterBar';

interface Event {
  id: string;
  name: string;
  date: string;
  time: string | null;
  location: string;
  state: string;
  level: string;
  type: string;
  committee: string | null;
  description: string | null;
  bills: Array<{ number: string; title: string; url?: string; summary?: string }>;
  tags: string[];
  detailsUrl: string | null;
  docketUrl: string | null;
  agendaUrl: string | null;
  virtualMeetingUrl: string | null;
  allowsPublicParticipation: boolean;
  chamber: string | null;
  scraperSource: string;
  scrapedAt: string;
}

interface Bill {
  number: string;
  title: string;
  url?: string;
  state: string;
  eventName: string;
  eventDate: string;
  tags?: string[];
  summary?: string;
}

interface Agenda {
  id: string;
  name: string;
  date: string;
  time: string | null;
  state: string;
  committee: string | null;
  docket_url: string;
  details_url: string | null;
  agenda_id: string | null;
  agenda_url: string | null;
  agenda_summary: string | null;
  last_summarized_at: string | null;
}

interface DataResponse {
  events: Event[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  filters: {
    state: string | null;
    level: string | null;
    date: string | null;
  };
  stats?: {
    withBills: number;
    withTags: number;
    withParticipation: number;
  };
}

type ViewTab = 'events' | 'bills' | 'agendas';
type SortField = 'date' | 'state' | 'name' | 'bills';
type SortDirection = 'asc' | 'desc';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

interface DataViewerProps {
  onStateSelect?: (state: string) => void;
}

export default function DataViewer({ onStateSelect }: DataViewerProps) {
  const [activeTab, setActiveTab] = useState<ViewTab>('events');
  const [data, setData] = useState<DataResponse | null>(null);
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [stateFilter, setStateFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (stateFilter) params.set('state', stateFilter);
      if (levelFilter) params.set('level', levelFilter);
      if (dateFilter) params.set('date', dateFilter);
      params.set('limit', '500'); // Increased to get more events with bills
      
      const [eventsResponse, agendasResponse] = await Promise.all([
        fetch(`/api/admin-events?${params}`),
        fetch(`/api/agenda-summaries?${params}`)
      ]);
      
      if (!eventsResponse.ok) {
        throw new Error(`Failed to fetch events: ${eventsResponse.status}`);
      }
      
      const result = await eventsResponse.json();
      setData(result);
      
      if (agendasResponse.ok) {
        const agendasResult = await agendasResponse.json();
        setAgendas(agendasResult.agendas || []);
      }
      
      setError(null);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [stateFilter, levelFilter, dateFilter]);

  // Extract all bills from events
  const allBills: Bill[] = data?.events.flatMap(event => 
    (event.bills || []).map(bill => ({
      ...bill,
      state: event.state,
      eventName: event.name,
      eventDate: event.date,
      tags: event.tags
    }))
  ) || [];

  // Filter and sort events
  const filteredEvents = (data?.events || [])
    .filter(event => {
      if (selectedTags.length > 0 && !event.tags?.some(t => selectedTags.includes(t))) return false;
      if (searchQuery && !event.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !event.committee?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'state':
          comparison = (a.state || '').localeCompare(b.state || '');
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'bills':
          comparison = (a.bills?.length || 0) - (b.bills?.length || 0);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  // Filter and sort bills
  const filteredBills = allBills
    .filter(bill => {
      if (stateFilter && bill.state !== stateFilter) return false;
      if (selectedTags.length > 0 && !bill.tags?.some(t => selectedTags.includes(t))) return false;
      if (searchQuery && !bill.number.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !bill.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      const comparison = a.number.localeCompare(b.number);
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  if (loading && !data) {
    return (
      <div className="data-viewer">
        <h1>📊 Database Event Viewer</h1>
        <p>Loading events...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="data-viewer">
        <h1>📊 Database Event Viewer</h1>
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="data-viewer">
      <header className="viewer-header">
        <h1>📊 Database Viewer</h1>
        <p className="subtitle">Browse all events and bills from the database</p>
      </header>

      {/* Tab Navigation */}
      <div className="viewer-tabs">
        <button
          className={`tab-button ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          📅 Events ({filteredEvents.length})
        </button>
        <button
          className={`tab-button ${activeTab === 'bills' ? 'active' : ''}`}
          onClick={() => setActiveTab('bills')}
        >
          📋 Bills ({allBills.length})
        </button>
        <button
          className={`tab-button ${activeTab === 'agendas' ? 'active' : ''}`}
          onClick={() => setActiveTab('agendas')}
        >
          📄 Agendas ({agendas.length})
        </button>
      </div>

      {/* Filter Bar - Horizontal like home view */}
      <FilterBar
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
      />

      {/* Search and Filters */}
      <div className="filters">
        <div className="filter-group">
          <label>🔍 Search:</label>
          <input
            type="text"
            placeholder={activeTab === 'events' ? 'Search events...' : 'Search bills...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <label>State:</label>
          <select 
            value={stateFilter} 
            onChange={(e) => {
              const newState = e.target.value;
              setStateFilter(newState);
              if (newState && onStateSelect) {
                onStateSelect(newState);
              }
            }}
          >
            <option value="">All States</option>
            {US_STATES.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </div>

        {activeTab === 'events' && (
          <div className="filter-group">
            <label>Level:</label>
            <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
              <option value="">All Levels</option>
              <option value="federal">Federal</option>
              <option value="state">State</option>
              <option value="local">Local</option>
            </select>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="filter-group">
            <label>Date:</label>
            <input 
              type="date" 
              value={dateFilter} 
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
        )}

        <button 
          onClick={() => {
            setStateFilter('');
            setLevelFilter('');
            setDateFilter('');
            setSelectedTags([]);
            setSearchQuery('');
          }}
          className="clear-button"
        >
          Clear All
        </button>
      </div>

      {data && (
        <>
          {/* Events Table */}
          {activeTab === 'events' && (
            <div className="events-table-container">
              <div className="table-header">
                <h2>Events</h2>
                <div className="sort-controls">
                  <span>Sort by:</span>
                  <button
                    className={sortField === 'date' ? 'active' : ''}
                    onClick={() => handleSort('date')}
                  >
                    Date {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </button>
                  <button
                    className={sortField === 'state' ? 'active' : ''}
                    onClick={() => handleSort('state')}
                  >
                    State {sortField === 'state' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </button>
                  <button
                    className={sortField === 'name' ? 'active' : ''}
                    onClick={() => handleSort('name')}
                  >
                    Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </button>
                  <button
                    className={sortField === 'bills' ? 'active' : ''}
                    onClick={() => handleSort('bills')}
                  >
                    Bills {sortField === 'bills' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </button>
                </div>
              </div>
              <table className="events-table">
                <thead>
                  <tr>
                    <th>Date/Time</th>
                    <th>Event Details</th>
                    <th>State</th>
                    <th>Level</th>
                    <th>Bills</th>
                    <th>Tags</th>
                    <th>URLs</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((event) => {
                  const eventDate = new Date(event.date);
                  const dateStr = eventDate.toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  });
                  
                  return (
                  <tr key={event.id}>
                    <td className="date-cell">
                      <div className="event-date">{dateStr}</div>
                      {event.time && <div className="time">🕐 {event.time}</div>}
                    </td>
                    <td className="name-cell">
                      <div className="event-name">{event.name}</div>
                      {event.committee && <div className="committee">🏛️ {event.committee}</div>}
                      {event.location && <div className="location">📍 {event.location}</div>}
                      {event.description && (
                        <div className="event-description" title={event.description}>
                          📄 {event.description}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="state-badge">{event.state || 'N/A'}</span>
                    </td>
                    <td>
                      <span className={`level-badge ${event.level}`}>{event.level}</span>
                    </td>
                    <td>
                      {event.bills && event.bills.length > 0 ? (
                        <div className="bills-list">
                          {event.bills.slice(0, 3).map((bill, i) => (
                            <div key={i} className="bill-item">
                              {bill.url ? (
                                <a href={bill.url} target="_blank" rel="noopener noreferrer" title={bill.title}>
                                  {bill.number}
                                </a>
                              ) : (
                                <span title={bill.title}>{bill.number}</span>
                              )}
                            </div>
                          ))}
                          {event.bills.length > 3 && (
                            <div className="more">+{event.bills.length - 3} more</div>
                          )}
                        </div>
                      ) : '-'}
                    </td>
                    <td>
                      {event.tags && event.tags.length > 0 ? (
                        <div className="tags-list">
                          {event.tags.map((tag, i) => {
                            const tagDef = TAG_DEFINITIONS[tag];
                            return tagDef ? (
                              <span key={i} className="tag" style={{ backgroundColor: tagDef.color + '20', color: tagDef.color, border: `1px solid ${tagDef.color}` }}>
                                {tagDef.icon} {tagDef.label}
                              </span>
                            ) : (
                              <span key={i} className="tag">{tag}</span>
                            );
                          })}
                        </div>
                      ) : '-'}
                    </td>
                    <td>
                      {event.detailsUrl && <a href={event.detailsUrl} target="_blank" rel="noopener noreferrer">📄</a>}
                      {event.docketUrl && <a href={event.docketUrl} target="_blank" rel="noopener noreferrer">📋</a>}
                      {event.virtualMeetingUrl && <a href={event.virtualMeetingUrl} target="_blank" rel="noopener noreferrer">🎥</a>}
                      {event.agendaUrl && <a href={event.agendaUrl} target="_blank" rel="noopener noreferrer">📅</a>}
                      {!event.detailsUrl && !event.docketUrl && !event.virtualMeetingUrl && !event.agendaUrl && '-'}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Bills Table */}
        {activeTab === 'bills' && (
          <div className="bills-table-container">
            <div className="table-header">
              <h2>All Bills</h2>
              <div className="sort-controls">
                <span>Sort:</span>
                <button onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}>
                  Bill Number {sortDirection === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
            <table className="bills-table">
              <thead>
                <tr>
                  <th>Bill Number</th>
                  <th>Title</th>
                  <th>Summary</th>
                  <th>State</th>
                  <th>Event</th>
                  <th>Event Date</th>
                  <th>Tags</th>
                  <th>Link</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.map((bill, index) => (
                  <tr key={`${bill.number}-${index}`}>
                    <td className="bill-number-cell">
                      <strong>{bill.number}</strong>
                    </td>
                    <td className="bill-title-cell">
                      {bill.title}
                    </td>
                    <td className="bill-summary-cell">
                      {bill.summary ? (
                        <div className="bill-summary">{bill.summary}</div>
                      ) : (
                        <span className="no-summary">No summary available</span>
                      )}
                    </td>
                    <td>
                      <span className="state-badge">{bill.state}</span>
                    </td>
                    <td className="event-name-cell">
                      {bill.eventName}
                    </td>
                    <td>
                      {new Date(bill.eventDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td>
                      {bill.tags && bill.tags.length > 0 ? (
                        <div className="tags-list">
                          {bill.tags.slice(0, 2).map((tag, i) => {
                            const tagDef = TAG_DEFINITIONS[tag];
                            return tagDef ? (
                              <span key={i} className="tag" style={{ backgroundColor: tagDef.color + '20', color: tagDef.color, border: `1px solid ${tagDef.color}` }}>
                                {tagDef.icon}
                              </span>
                            ) : null;
                          })}
                          {bill.tags.length > 2 && (
                            <span className="more">+{bill.tags.length - 2}</span>
                          )}
                        </div>
                      ) : '-'}
                    </td>
                    <td>
                      {bill.url ? (
                        <a href={bill.url} target="_blank" rel="noopener noreferrer" className="bill-link">
                          View →
                        </a>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredBills.length === 0 && (
              <div className="no-results">
                No bills match your filters
              </div>
            )}
          </div>
        )}

        {/* Agendas Table */}
        {activeTab === 'agendas' && (
          <div className="agendas-table-container">
            <div className="table-header">
              <h2>Meeting Agendas with Summaries</h2>
              <p className="subtitle">Agendas from events with docket URLs</p>
            </div>
            <table className="agendas-table">
              <thead>
                <tr>
                  <th>Event Name</th>
                  <th>Committee</th>
                  <th>Date</th>
                  <th>State</th>
                  <th>Summary</th>
                  <th>Links</th>
                </tr>
              </thead>
              <tbody>
                {agendas
                  .filter(agenda => {
                    if (searchQuery && !agenda.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
                        !agenda.committee?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                    return true;
                  })
                  .map((agenda) => (
                  <tr key={agenda.id}>
                    <td className="event-name-cell">
                      <strong>{agenda.name}</strong>
                    </td>
                    <td>
                      {agenda.committee || '-'}
                    </td>
                    <td>
                      {new Date(agenda.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                      {agenda.time && <div className="event-time">{agenda.time}</div>}
                    </td>
                    <td>
                      <span className="state-badge">{agenda.state}</span>
                    </td>
                    <td className="agenda-summary-cell">
                      {agenda.agenda_summary ? (
                        <div className="agenda-summary">{agenda.agenda_summary}</div>
                      ) : (
                        <span className="no-summary">No summary available</span>
                      )}
                    </td>
                    <td>
                      <div className="agenda-links">
                        {agenda.docket_url && (
                          <a href={agenda.docket_url} target="_blank" rel="noopener noreferrer" className="agenda-link">
                            📄 Agenda
                          </a>
                        )}
                        {agenda.details_url && (
                          <a href={agenda.details_url} target="_blank" rel="noopener noreferrer" className="agenda-link">
                            🔗 Details
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {agendas.length === 0 && (
              <div className="no-results">
                No agendas available with docket URLs
              </div>
            )}
          </div>
        )}
      </>
    )}
    </div>
  );
}
