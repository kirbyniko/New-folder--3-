import React from 'react';
import '../styles/EnrichmentNotice.css';

interface EnrichmentNoticeProps {
  eventsCount: number;
  enrichableCount: number;
}

/**
 * Shows a notice that events are being enriched with additional data
 */
export const EnrichmentNotice: React.FC<EnrichmentNoticeProps> = ({ 
  eventsCount, 
  enrichableCount 
}) => {
  if (enrichableCount === 0) return null;

  return (
    <div className="enrichment-notice">
      <div className="enrichment-icon">🔄</div>
      <div className="enrichment-content">
        <div className="enrichment-title">
          Enriching {enrichableCount} event{enrichableCount !== 1 ? 's' : ''} with docket details
        </div>
        <div className="enrichment-subtitle">
          Loading bills, Zoom links, and full docket information. This may take 2-3 minutes on first load.
          Results will be cached for 6 hours.
        </div>
        <div className="enrichment-progress">
          <div className="progress-bar">
            <div className="progress-fill" />
          </div>
        </div>
      </div>
    </div>
  );
};
