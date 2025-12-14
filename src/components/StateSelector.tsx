import { useState } from 'react'
import './StateSelector.css'

const STATES = [
  { abbr: 'AL', name: 'Alabama', hasData: true },
  { abbr: 'AK', name: 'Alaska', hasData: true },
  { abbr: 'AZ', name: 'Arizona', hasData: true },
  { abbr: 'AR', name: 'Arkansas', hasData: true },
  { abbr: 'CA', name: 'California', hasData: true },
  { abbr: 'CO', name: 'Colorado', hasData: true },
  { abbr: 'CT', name: 'Connecticut', hasData: true },
  { abbr: 'DE', name: 'Delaware', hasData: true },
  { abbr: 'FL', name: 'Florida', hasData: true },
  { abbr: 'GA', name: 'Georgia', hasData: true },
  { abbr: 'HI', name: 'Hawaii', hasData: true },
  { abbr: 'ID', name: 'Idaho', hasData: true },
  { abbr: 'IL', name: 'Illinois', hasData: true },
  { abbr: 'IN', name: 'Indiana', hasData: true },
  { abbr: 'IA', name: 'Iowa', hasData: true },
  { abbr: 'KS', name: 'Kansas', hasData: true },
  { abbr: 'KY', name: 'Kentucky', hasData: true },
  { abbr: 'LA', name: 'Louisiana', hasData: true },
  { abbr: 'ME', name: 'Maine', hasData: true },
  { abbr: 'MD', name: 'Maryland', hasData: true },
  { abbr: 'MA', name: 'Massachusetts', hasData: true },
  { abbr: 'MI', name: 'Michigan', hasData: true },
  { abbr: 'MN', name: 'Minnesota', hasData: true },
  { abbr: 'MS', name: 'Mississippi', hasData: true },
  { abbr: 'MO', name: 'Missouri', hasData: true },
  { abbr: 'MT', name: 'Montana', hasData: true },
  { abbr: 'NE', name: 'Nebraska', hasData: true },
  { abbr: 'NV', name: 'Nevada', hasData: true },
  { abbr: 'NH', name: 'New Hampshire', hasData: true },
  { abbr: 'NJ', name: 'New Jersey', hasData: true },
  { abbr: 'NM', name: 'New Mexico', hasData: true },
  { abbr: 'NY', name: 'New York', hasData: true },
  { abbr: 'NC', name: 'North Carolina', hasData: true },
  { abbr: 'ND', name: 'North Dakota', hasData: true },
  { abbr: 'OH', name: 'Ohio', hasData: true },
  { abbr: 'OK', name: 'Oklahoma', hasData: true },
  { abbr: 'OR', name: 'Oregon', hasData: true },
  { abbr: 'PA', name: 'Pennsylvania', hasData: true },
  { abbr: 'RI', name: 'Rhode Island', hasData: true },
  { abbr: 'SC', name: 'South Carolina', hasData: true },
  { abbr: 'SD', name: 'South Dakota', hasData: true },
  { abbr: 'TN', name: 'Tennessee', hasData: true },
  { abbr: 'TX', name: 'Texas', hasData: true },
  { abbr: 'UT', name: 'Utah', hasData: true },
  { abbr: 'VT', name: 'Vermont', hasData: true },
  { abbr: 'VA', name: 'Virginia', hasData: true },
  { abbr: 'WA', name: 'Washington', hasData: true },
  { abbr: 'WV', name: 'West Virginia', hasData: true },
  { abbr: 'WI', name: 'Wisconsin', hasData: true },
  { abbr: 'WY', name: 'Wyoming', hasData: true }
]

interface StateSelectorProps {
  selectedState: string | null
  onSelectState: (stateAbbr: string) => void
}

export default function StateSelector({ selectedState, onSelectState }: StateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredStates = STATES.filter(state =>
    state.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    state.abbr.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelect = (stateAbbr: string) => {
    onSelectState(stateAbbr)
    setIsOpen(false)
    setSearchTerm('')
  }

  return (
    <div className="state-selector">
      <button
        className="state-selector-button"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span className="state-selector-icon">🗺️</span>
        <span>Browse by State</span>
        <span className="state-selector-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="state-selector-dropdown">
          <div className="state-selector-search">
            <input
              type="text"
              placeholder="Search states..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="state-selector-search-input"
              autoFocus
            />
          </div>
          
          <div className="state-selector-list">
            {filteredStates.map(state => (
              <button
                key={state.abbr}
                className={`state-selector-item ${selectedState === state.abbr ? 'selected' : ''} ${!state.hasData ? 'no-data' : ''}`}
                onClick={() => handleSelect(state.abbr)}
                type="button"
              >
                <span className="state-name">{state.name}</span>
                <span className="state-abbr">{state.abbr}</span>
                {state.hasData ? (
                  <span className="state-badge live">✓ Live</span>
                ) : (
                  <span className="state-badge placeholder">Coming Soon</span>
                )}
              </button>
            ))}
          </div>

          {filteredStates.length === 0 && (
            <div className="state-selector-empty">
              No states found matching "{searchTerm}"
            </div>
          )}
        </div>
      )}
    </div>
  )
}
