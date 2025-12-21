import React from 'react'
import './Navbar.css'

interface NavbarProps {
  zipCode: string
  onZipCodeChange: (value: string) => void
  onSearch: (e: React.FormEvent) => void
  loading: boolean
  onAdminClick?: () => void
  showAdmin?: boolean
}

const Navbar: React.FC<NavbarProps> = ({ zipCode, onZipCodeChange, onSearch, loading, onAdminClick, showAdmin }) => {
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
