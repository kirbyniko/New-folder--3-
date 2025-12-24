import { useState } from 'react';

interface StateProgress {
  code: string;
  name: string;
  status: 'complete' | 'partial' | 'pending';
  notes?: string;
}

interface StateSidebarProps {
  onStateSelect?: (stateCode: string) => void;
  selectedState?: string | null;
}

const STATE_PROGRESS: StateProgress[] = [
  { code: 'AK', name: 'Alaska', status: 'complete', notes: 'BASIS committee system' },
  { code: 'AL', name: 'Alabama', status: 'complete', notes: '3 state + Birmingham + Montgomery' },
  { code: 'AR', name: 'Arkansas', status: 'complete', notes: '18 state + Little Rock + Jonesboro' },
  { code: 'AZ', name: 'Arizona', status: 'complete', notes: 'ALIS calendar + bills' },
  { code: 'CO', name: 'Colorado', status: 'complete', notes: '19 interim events' },
  { code: 'CT', name: 'Connecticut', status: 'complete', notes: 'State + Bridgeport' },
    { code: 'DE', name: 'Delaware', status: 'complete', notes: '5 state + Wilmington' },
  { code: 'HI', name: 'Hawaii', status: 'complete', notes: '26 events' },
  { code: 'ID', name: 'Idaho', status: 'complete', notes: 'State + 68 Boise' },
  { code: 'IL', name: 'Illinois', status: 'complete', notes: 'Not in session' },
  { code: 'IA', name: 'Iowa', status: 'complete', notes: 'State + Des Moines' },
  { code: 'IN', name: 'Indiana', status: 'complete', notes: 'Not in session (OpenStates)' },
  { code: 'KS', name: 'Kansas', status: 'complete', notes: 'Not in session (OpenStates)' },
  { code: 'KY', name: 'Kentucky', status: 'complete', notes: '4 state + Lexington + Louisville' },
  { code: 'LA', name: 'Louisiana', status: 'complete', notes: '4 state + 81 Baton Rouge' },
  { code: 'MA', name: 'Massachusetts', status: 'complete', notes: 'Joint hearings' },
  { code: 'MD', name: 'Maryland', status: 'complete', notes: 'State + Baltimore' },
  { code: 'ME', name: 'Maine', status: 'complete', notes: 'Puppeteer + Bills' },
  { code: 'MN', name: 'Minnesota', status: 'complete', notes: '20 committee meetings' },
  { code: 'MS', name: 'Mississippi', status: 'complete', notes: 'Multi-chamber calendar' },
  { code: 'MO', name: 'Missouri', status: 'complete', notes: 'House + Senate' },
  { code: 'MT', name: 'Montana', status: 'complete', notes: 'Interim committees (Puppeteer)' },
  { code: 'NE', name: 'Nebraska', status: 'complete', notes: 'Unicameral hearings' },
  { code: 'NH', name: 'New Hampshire', status: 'complete', notes: 'House + Senate (66 events)' },
  { code: 'NJ', name: 'New Jersey', status: 'complete', notes: 'Newark (Legistar)' },
  { code: 'NV', name: 'Nevada', status: 'complete', notes: '87 interim events' },
  { code: 'NM', name: 'New Mexico', status: 'complete', notes: 'OpenStates API' },
  { code: 'NC', name: 'North Carolina', status: 'complete', notes: 'State + Raleigh + Greensboro' },
  { code: 'OK', name: 'Oklahoma', status: 'complete', notes: '5 state + 7 OKC' },
  { code: 'OR', name: 'Oregon', status: 'complete', notes: '1 state + Portland + Salem' },
  { code: 'SC', name: 'South Carolina', status: 'complete', notes: '2 upcoming meetings' },
  { code: 'TN', name: 'Tennessee', status: 'complete', notes: 'House + Senate' },
  { code: 'TX', name: 'Texas', status: 'complete', notes: 'Houston + Dallas + Austin + San Antonio + 6 more' },
  { code: 'UT', name: 'Utah', status: 'complete', notes: 'Committee meetings via JSON API' },
  { code: 'VA', name: 'Virginia', status: 'complete', notes: 'State + Virginia Beach + Alexandria + Hampton' },
  { code: 'WA', name: 'Washington', status: 'complete', notes: 'State + Seattle + Bellevue' },
  { code: 'WI', name: 'Wisconsin', status: 'complete', notes: 'State + Milwaukee + Madison' },
  { code: 'WY', name: 'Wyoming', status: 'complete', notes: 'Puppeteer table parsing, 0 events (not in session)' },
];

export function StateSidebar({ onStateSelect, selectedState }: StateSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const complete = STATE_PROGRESS.filter(s => s.status === 'complete').length;
  const partial = STATE_PROGRESS.filter(s => s.status === 'partial').length;
  const total = STATE_PROGRESS.length;

  const handleStateClick = (stateCode: string) => {
    if (onStateSelect) {
      // Toggle: if already selected, deselect
      onStateSelect(selectedState === stateCode ? '' : stateCode);
    }
  };

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
              <div 
                key={state.code} 
                className={`state-item ${state.status} ${selectedState === state.code ? 'selected' : ''}`}
                onClick={() => state.status === 'complete' && handleStateClick(state.code)}
                style={{ cursor: state.status === 'complete' ? 'pointer' : 'default' }}
              >
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
                <span>Complete - Click to filter</span>
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
