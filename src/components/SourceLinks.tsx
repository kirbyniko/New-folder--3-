import { useState } from 'react';
import type { LegislativeEvent } from '../types/event';
import './SourceLinks.css';

interface SourceLinksProps {
  federalEvents: LegislativeEvent[];
  stateEvents: LegislativeEvent[];
  localEvents: LegislativeEvent[];
  selectedState?: string; // For display purposes (state name in messages)
  searchedState?: string; // The state from ZIP code search
  calendarSources?: { name: string; url: string; description: string }[];
  simpleMode?: boolean; // If true, shows sources directly without dropdown
}

export function SourceLinks({ federalEvents, stateEvents, localEvents, selectedState, searchedState, calendarSources = [], simpleMode = false }: SourceLinksProps) {
  const [isExpanded, setIsExpanded] = useState(simpleMode); // Start expanded if simpleMode

  const totalEvents = federalEvents.length + stateEvents.length + localEvents.length;

  // Always show if we have calendar sources OR if a search was performed (searchedState exists)
  // This ensures the dropdown appears even with 0 events
  const shouldShow = calendarSources.length > 0 || totalEvents > 0 || searchedState;
  
  console.log('🔍 SourceLinks Debug:', {
    calendarSources: calendarSources.length,
    totalEvents,
    searchedState,
    shouldShow
  });
  
  if (!shouldShow) return null;

  return (
    <div className={`source-links ${simpleMode ? 'source-links-simple' : ''}`}>
      {!simpleMode && (
        <button 
          className="source-links-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
        >
          <span className="source-links-icon">{isExpanded ? '▼' : '▶'}</span>
          <span className="source-links-title">Data Sources</span>
          {totalEvents > 0 && (
            <span className="source-links-badge">
              {totalEvents} events
            </span>
          )}
        </button>
      )}

      {(isExpanded || simpleMode) && (
        <div className="source-links-content">
          {/* Display calendar sources from scraper */}
          {calendarSources.length > 0 && (
            <div className="source-section">
              {!simpleMode && <h4>📅 Legislative Calendar Sources</h4>}
              <ul>
                {calendarSources.map((source, i) => (
                  <li key={i}>
                    <a href={source.url} target="_blank" rel="noopener noreferrer">
                      🔗 {source.name}
                    </a>
                    <span className="source-desc">{source.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {calendarSources.length === 0 && totalEvents === 0 && (
            <div className="source-section">
              <p className="source-empty">
                No calendar sources or events available.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
