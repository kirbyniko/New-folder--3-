import { useState, useEffect } from 'react';
import './DataSourcesView.css';
import { getApiUrl } from '../config/api';

interface DataSource {
  id: string;
  state_code: string;
  name: string;
  url: string;
  type: string;
  description: string | null;
  status: string;
  notes: string | null;
  update_frequency_hours: number | null;
}

interface StateData {
  state_code: string;
  state_name: string;
  sources: {
    state: DataSource[];
    local: DataSource[];
  };
  expanded: boolean;
}

const STATE_NAMES: Record<string, string> = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
  'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
  'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
  'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
  'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
  'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
  'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
  'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
  'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
  'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
  'WI': 'Wisconsin', 'WY': 'Wyoming'
};

const US_STATES = Object.keys(STATE_NAMES).sort();

export default function DataSourcesView() {
  const [states, setStates] = useState<StateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAllDataSources();
  }, []);

  const fetchAllDataSources = async () => {
    try {
      setLoading(true);
      
      // Fetch data sources from all states
      const sourcesResults = await Promise.all(
        US_STATES.map(async (stateCode) => {
          try {
            const response = await fetch(getApiUrl(`/api/state-events?state=${stateCode}&limit=1`));
            const sourcesHeader = response.headers.get('X-Calendar-Sources');
            
            if (sourcesHeader) {
              const sources: DataSource[] = JSON.parse(sourcesHeader);
              return {
                state_code: stateCode,
                sources: sources
              };
            }
            return { state_code: stateCode, sources: [] };
          } catch (err) {
            console.error(`Error fetching sources for ${stateCode}:`, err);
            return { state_code: stateCode, sources: [] };
          }
        })
      );

      // Organize sources by state and level
      const stateData: StateData[] = sourcesResults.map(({ state_code, sources }) => {
        // Determine if source is state-level or local-level based on name/type
        const stateSources = sources.filter(s => 
          !s.name.toLowerCase().includes('legistar') && 
          !s.name.toLowerCase().includes('local') &&
          !s.name.toLowerCase().includes('city') &&
          !s.name.toLowerCase().includes('county')
        );
        
        const localSources = sources.filter(s => 
          s.name.toLowerCase().includes('legistar') || 
          s.name.toLowerCase().includes('local') ||
          s.name.toLowerCase().includes('city') ||
          s.name.toLowerCase().includes('county')
        );

        return {
          state_code,
          state_name: STATE_NAMES[state_code],
          sources: {
            state: stateSources,
            local: localSources
          },
          expanded: false
        };
      });

      setStates(stateData);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching data sources:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleState = (stateCode: string) => {
    setExpandedStates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stateCode)) {
        newSet.delete(stateCode);
      } else {
        newSet.add(stateCode);
      }
      return newSet;
    });
  };

  const filteredStates = states.filter(state => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      state.state_code.toLowerCase().includes(query) ||
      state.state_name.toLowerCase().includes(query) ||
      state.sources.state.some(s => s.name.toLowerCase().includes(query)) ||
      state.sources.local.some(s => s.name.toLowerCase().includes(query))
    );
  });

  const renderSourceCard = (source: DataSource, level: 'State' | 'Local') => (
    <div key={source.id} className="source-card">
      <div className="source-header">
        <div className="source-title">
          <span className="source-level-badge">{level}</span>
          <a href={source.url} target="_blank" rel="noopener noreferrer" className="source-name">
            {source.name}
          </a>
        </div>
        <span className={`source-status ${source.status}`}>
          {source.status === 'active' ? '✓ Active' : '⚠ Inactive'}
        </span>
      </div>
      
      {source.description && (
        <p className="source-description">{source.description}</p>
      )}
      
      <div className="source-meta">
        <span className="source-type">{source.type}</span>
        {source.update_frequency_hours && (
          <span className="source-frequency">Updates every {source.update_frequency_hours}h</span>
        )}
      </div>
      
      {source.notes && (
        <div className="source-notes">
          <strong>Notes:</strong> {source.notes}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="data-sources-view">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading data sources from all 50 states...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="data-sources-view">
        <div className="error-state">
          <p>Error loading data sources: {error}</p>
          <button onClick={fetchAllDataSources}>Retry</button>
        </div>
      </div>
    );
  }

  const totalSources = states.reduce((sum, state) => 
    sum + state.sources.state.length + state.sources.local.length, 0
  );

  return (
    <div className="data-sources-view">
      <div className="data-sources-header">
        <h2>Legislative Data Sources</h2>
        <p className="subtitle">
          Scrapers collecting data from {totalSources} sources across all 50 states
        </p>
        
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search states or sources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="states-table">
        {filteredStates.map((state) => {
          const isExpanded = expandedStates.has(state.state_code);
          const totalStateSources = state.sources.state.length + state.sources.local.length;
          
          return (
            <div key={state.state_code} className="state-row">
              <div 
                className="state-summary"
                onClick={() => toggleState(state.state_code)}
              >
                <div className="state-info">
                  <span className="state-code">{state.state_code}</span>
                  <span className="state-name">{state.state_name}</span>
                </div>
                
                <div className="state-stats">
                  <span className="source-count">
                    {totalStateSources} source{totalStateSources !== 1 ? 's' : ''}
                  </span>
                  {state.sources.state.length > 0 && (
                    <span className="level-badge state-badge">{state.sources.state.length} State</span>
                  )}
                  {state.sources.local.length > 0 && (
                    <span className="level-badge local-badge">{state.sources.local.length} Local</span>
                  )}
                  
                  <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                </div>
              </div>

              {isExpanded && (
                <div className="state-details">
                  {state.sources.state.length > 0 && (
                    <div className="sources-section">
                      <h4>State-Level Sources</h4>
                      <div className="sources-list">
                        {state.sources.state.map(source => renderSourceCard(source, 'State'))}
                      </div>
                    </div>
                  )}
                  
                  {state.sources.local.length > 0 && (
                    <div className="sources-section">
                      <h4>Local-Level Sources</h4>
                      <div className="sources-list">
                        {state.sources.local.map(source => renderSourceCard(source, 'Local'))}
                      </div>
                    </div>
                  )}

                  {totalStateSources === 0 && (
                    <div className="no-sources">
                      <p>No data sources configured for this state yet.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredStates.length === 0 && (
        <div className="empty-state">
          <p>No states match your search.</p>
        </div>
      )}
    </div>
  );
}
