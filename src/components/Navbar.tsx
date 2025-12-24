import React from 'react'
import './Navbar.css'

interface NavbarProps {
  zipCode: string
  onZipCodeChange: (value: string) => void
  onSearch: (e: React.FormEvent) => void
  loading: boolean
  onAdminClick?: () => void
  showAdmin?: boolean
  selectedState: string | null
  onStateSelect: (state: string) => void
}

const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }
];

const Navbar: React.FC<NavbarProps> = ({ zipCode, onZipCodeChange, onSearch, loading, onAdminClick, showAdmin, selectedState, onStateSelect }) => {
  return (
    <nav className="navbar">
      <div className="navbar-content">
        <div className="navbar-brand">
          <h1>🏛️ Civitron</h1>
        </div>
        
        <form onSubmit={onSearch} className="navbar-search">
          <input
            type="text"
            value={zipCode}
            onChange={(e) => onZipCodeChange(e.target.value.replace(/\D/g, '').slice(0, 5))}
            placeholder="Enter ZIP code"
            maxLength={5}
            className="navbar-input"
            disabled={loading}
          />
          <button type="submit" className="navbar-button" disabled={loading}>
            {loading ? '...' : '🔍'}
          </button>
        </form>
        
        <select 
          className="navbar-state-select"
          value={selectedState || ''}
          onChange={(e) => onStateSelect(e.target.value)}
          disabled={loading}
        >
          <option value="">All States</option>
          {US_STATES.map(state => (
            <option key={state.code} value={state.code}>
              {state.name}
            </option>
          ))}
        </select>

        {onAdminClick && (
          <button onClick={onAdminClick} className="navbar-admin-button">
            {showAdmin ? '🏠 Home' : '📊 Data Viewer'}
          </button>
        )}
      </div>
    </nav>
  )
}

export default Navbar
