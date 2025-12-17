import { useState } from 'react';

interface StateProgress {
  code: string;
  name: string;
  status: 'complete' | 'partial' | 'pending';
  notes?: string;
}

const STATE_PROGRESS: StateProgress[] = [
  { code: 'PA', name: 'Pennsylvania', status: 'complete', notes: '61 events, 29 bills' },
  { code: 'MI', name: 'Michigan', status: 'complete', notes: '34 bills' },
  { code: 'TX', name: 'Texas', status: 'complete', notes: 'Ready for 2027 session' },
  { code: 'FL', name: 'Florida', status: 'partial', notes: 'Session starts Jan 14, 2026' },
  { code: 'NC', name: 'North Carolina', status: 'complete', notes: '4 committee meetings' },
  { code: 'NY', name: 'New York', status: 'complete', notes: '2 public hearings' },
  { code: 'NJ', name: 'New Jersey', status: 'complete', notes: 'Committee meetings with live bill scraping' },
  { code: 'CA', name: 'California', status: 'complete', notes: 'Daily file scraper' },
  { code: 'IL', name: 'Illinois', status: 'complete', notes: 'API-based scraper' },
  { code: 'VA', name: 'Virginia', status: 'complete', notes: '42 events, 4 bills via Puppeteer (static)' },
  { code: 'WA', name: 'Washington', status: 'complete', notes: 'POST form-based scraper with bill API' },
  { code: 'AZ', name: 'Arizona', status: 'complete', notes: 'ALIS calendar API with bill extraction' },
  { code: 'CO', name: 'Colorado', status: 'complete', notes: '19 interim events with hearing items (static)' },
  { code: 'MN', name: 'Minnesota', status: 'complete', notes: '20 committee meetings (static)' },
  { code: 'SC', name: 'South Carolina', status: 'complete', notes: '2 upcoming meetings (static)' },
  { code: 'AL', name: 'Alabama', status: 'complete', notes: '3 events via OpenStates (static)' },
    { code: 'CT', name: 'Connecticut', status: 'complete', notes: 'State + Bridgeport local' },
    { code: 'NV', name: 'Nevada', status: 'complete', notes: 'Interim committees' },
  { code: 'OH', name: 'Ohio', status: 'pending' },
  { code: 'GA', name: 'Georgia', status: 'complete', notes: '6 events via OpenStates' },
  { code: 'NH', name: 'New Hampshire', status: 'complete', notes: 'Session + dockets' },
];

export function StateSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const complete = STATE_PROGRESS.filter(s => s.status === 'complete').length;
  const partial = STATE_PROGRESS.filter(s => s.status === 'partial').length;
  const total = STATE_PROGRESS.length;

  return (
    <div className={`state-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <button 
        className="sidebar-toggle"
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? '→' : '←'}
      </button>

      {!isCollapsed && (
        <>
          <div className="sidebar-header">
            <h3>State Scrapers</h3>
            <div className="progress-summary">
              <span className="progress-stat complete">{complete} Complete</span>
              <span className="progress-stat partial">{partial} Partial</span>
              <span className="progress-stat total">{total} Total</span>
            </div>
          </div>

          <div className="state-list">
            {STATE_PROGRESS.map((state) => (
              <div key={state.code} className={`state-item ${state.status}`}>
                <div className="state-header">
                  <input
                    type="checkbox"
                    checked={state.status === 'complete'}
                    disabled={state.status === 'partial'}
                    readOnly
                    aria-label={`${state.name} status: ${state.status}`}
                  />
                  <span className="state-code">{state.code}</span>
                  <span className="state-name">{state.name}</span>
                  <span className={`status-badge ${state.status}`}>
                    {state.status === 'complete' ? '✓' : 
                     state.status === 'partial' ? '◐' : '○'}
                  </span>
                </div>
                {state.notes && (
                  <div className="state-notes">{state.notes}</div>
                )}
              </div>
            ))}
          </div>

          <div className="sidebar-footer">
            <div className="legend">
              <div className="legend-item">
                <span className="legend-badge complete">✓</span>
                <span>Complete - Scraper working</span>
              </div>
              <div className="legend-item">
                <span className="legend-badge partial">◐</span>
                <span>Partial - Limited data</span>
              </div>
              <div className="legend-item">
                <span className="legend-badge pending">○</span>
                <span>Pending - Not implemented</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default StateSidebar;
