import { useState, useEffect } from 'react';
import './DataViewer.css';
import { TAG_DEFINITIONS } from '../utils/tagging';

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
  bills: Array<{ number: string; title: string }>;
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
}

export default function DataViewer() {
  const [data, setData] = useState<DataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [stateFilter, setStateFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (stateFilter) params.set('state', stateFilter);
      if (levelFilter) params.set('level', levelFilter);
      if (dateFilter) params.set('date', dateFilter);
      params.set('limit', '50');
      
      const response = await fetch(`/.netlify/functions/admin-events?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      
      const result = await response.json();
      setData(result);
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
        <h1>📊 Database Event Viewer</h1>
        <p className="subtitle">Verify data integrity: Scraper → PostgreSQL → Frontend</p>
      </header>

      <div className="filters">
        <div className="filter-group">
          <label>State:</label>
          <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
            <option value="">All States</option>
            <option value="CA">California</option>
            <option value="NY">New York</option>
            <option value="TX">Texas</option>
            <option value="FL">Florida</option>
            <option value="IL">Illinois</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Level:</label>
          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
            <option value="">All Levels</option>
            <option value="federal">Federal</option>
            <option value="state">State</option>
            <option value="local">Local</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Date:</label>
          <input 
            type="date" 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>

        <button onClick={() => {
          setStateFilter('');
          setLevelFilter('');
          setDateFilter('');
        }}>
          Clear Filters
        </button>
      </div>

      {data && (
        <>
          <div className="stats">
            <div className="stat-card">
              <div className="stat-value">{data.pagination.total}</div>
              <div className="stat-label">Total Events</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{data.events.length}</div>
              <div className="stat-label">Showing</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {data.events.filter(e => e.bills && e.bills.length > 0).length}
              </div>
              <div className="stat-label">With Bills</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {data.events.filter(e => e.tags && e.tags.length > 0).length}
              </div>
              <div className="stat-label">With Tags</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {data.events.filter(e => e.allowsPublicParticipation === true).length}
              </div>
              <div className="stat-label">Public Participation</div>
            </div>
          </div>

          <div className="events-table-container">
            <table className="events-table">
              <thead>
                <tr>
                  <th>Date/Time</th>
                  <th>Event Details</th>
                  <th>State</th>
                  <th>Level</th>
                  <th>Tags</th>
                  <th>Bills</th>
                  <th>URLs</th>
                  <th>Scraper</th>
                </tr>
              </thead>
              <tbody>
                {data.events.map((event) => {
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
                        <div className="description" title={event.description}>
                          📄 {event.description.length > 100 ? event.description.substring(0, 100) + '...' : event.description}
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
                          {event.tags.slice(0, 3).map((tag, i) => {
                            const tagDef = TAG_DEFINITIONS[tag];
                            return tagDef ? (
                              <span key={i} className="tag" style={{ backgroundColor: tagDef.color + '20', color: tagDef.color, border: `1px solid ${tagDef.color}` }}>
                                {tagDef.icon} {tagDef.label}
                              </span>
                            ) : (
                              <span key={i} className="tag">{tag}</span>
                            );
                          })}
                          {event.tags.length > 3 && (
                            <span className="more">+{event.tags.length - 3}</span>
                          )}
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
                    <td>
                      <div className="scraper-info">
                        <div className="scraper-name">{event.scraperSource}</div>
                        <div className="scraped-time">
                          {new Date(event.scrapedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
