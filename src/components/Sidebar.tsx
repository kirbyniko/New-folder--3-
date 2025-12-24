import React, { useState } from 'react'
import TagFilter from './TagFilter'
import { SourceLinks } from './SourceLinks'
import StateSelector from './StateSelector'
import './Sidebar.css'
import { LegislativeEvent } from '../types/event'

interface SidebarProps {
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
  selectedState: string | null
  onSelectState: (stateAbbr: string) => Promise<void>
  federalEvents: LegislativeEvent[]
  stateEvents: LegislativeEvent[]
  localEvents: LegislativeEvent[]
  searchedState: string | null
  calendarSources: any[]
  userLocation: { lat: number; lng: number } | null
}

const Sidebar: React.FC<SidebarProps> = ({
  selectedTags,
  onTagsChange,
  selectedState,
  onSelectState,
  federalEvents,
  stateEvents,
  localEvents,
  searchedState,
  calendarSources,
  userLocation
}) => {
  const [sourcesOpen, setSourcesOpen] = useState(false)

  return (
    <div className="sidebar">
      <div className="sidebar-section">
        <StateSelector
          selectedState={selectedState}
          onSelectState={onSelectState}
        />
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-header-static">
          <span>🏷️ Filters</span>
        </div>
        <div className="sidebar-section-content scrollable">
          <TagFilter
            selectedTags={selectedTags}
            onTagsChange={onTagsChange}
          />
        </div>
      </div>

      {userLocation && (
        <div className="sidebar-section">
          <button 
            className="sidebar-section-header"
            onClick={() => setSourcesOpen(!sourcesOpen)}
          >
            <span>📊 Data Sources</span>
            <span className="sidebar-chevron">{sourcesOpen ? '▼' : '▶'}</span>
          </button>
          {sourcesOpen && (
            <div className="sidebar-section-content">
              <SourceLinks
                federalEvents={federalEvents}
                stateEvents={stateEvents}
                localEvents={localEvents}
                selectedState={selectedState || searchedState || undefined}
                searchedState={searchedState || undefined}
                calendarSources={calendarSources}
              />
            </div>
          )}
        </div>
      )}

      <div className="sidebar-footer">
        <p className="sidebar-tagline">
          Discover legislative events near you - Federal, State, and Local
        </p>
      </div>
    </div>
  )
}

export default Sidebar
