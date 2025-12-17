import { useState, useEffect } from 'react';

interface CacheStatus {
  isWarming: boolean;
  elapsedTime: number;
  stats: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
    inProgress: string[];
    percentage: number;
  };
  states: {
    pending: string[];
    inProgress: string[];
    completed: string[];
    failed: string[];
  };
}

export function CacheLoadingBar() {
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let pollInterval: number;

    const checkCacheStatus = async () => {
      try {
        const response = await fetch('/.netlify/functions/cache-status');
        if (response.ok) {
          const status = await response.json();
          setCacheStatus(status);

          // Hide after completion
          if (!status.isWarming && status.stats.percentage === 100) {
            setTimeout(() => setVisible(false), 3000);
          }
        }
      } catch (error) {
        console.error('Failed to check cache status:', error);
      }
    };

    // Initial check
    checkCacheStatus();

    // Poll every 2 seconds while warming
    pollInterval = window.setInterval(checkCacheStatus, 2000);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []);

  // Don't render if not warming and completed, or hidden
  if (!visible || !cacheStatus || (!cacheStatus.isWarming && cacheStatus.stats.percentage === 100)) {
    return null;
  }

  const { stats, elapsedTime, isWarming } = cacheStatus;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '12px 20px',
      zIndex: 9999,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <div style={{ fontSize: '14px', fontWeight: 600 }}>
            {isWarming ? '🔄 Loading state legislative data...' : '✅ Cache ready'}
          </div>
          <div style={{ fontSize: '13px', opacity: 0.9 }}>
            {stats.completed + stats.failed} / {stats.total} states • {elapsedTime}s
          </div>
        </div>
        
        <div style={{
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '10px',
          height: '8px',
          overflow: 'hidden'
        }}>
          <div style={{
            background: 'white',
            height: '100%',
            width: `${stats.percentage}%`,
            transition: 'width 0.3s ease',
            borderRadius: '10px'
          }} />
        </div>

        {stats.inProgress.length > 0 && (
          <div style={{ 
            fontSize: '12px', 
            marginTop: '6px', 
            opacity: 0.85 
          }}>
            Currently loading: {stats.inProgress.join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}
