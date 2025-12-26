/**
 * Cache Info API - Get cache status for all states
 * 
 * Returns information about cache files:
 * - Exists or not
 * - Age (time since creation)
 * - TTL remaining
 * - File size
 */

import { CacheManager } from '../../netlify/functions/utils/scrapers/cache-manager';

export async function onRequest(context: any) {
  const { request } = context;
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(request.url);
    const stateCode = url.searchParams.get('state')?.toUpperCase();

    // Get all cache entries
    const entries = CacheManager.getAllEntries();
    
    // Filter for scraper caches (format: scraper:XX:events)
    const scraperCaches = entries
      .filter(entry => entry.key.startsWith('scraper:') && entry.key.endsWith(':events'))
      .map(entry => {
        const stateMatch = entry.key.match(/scraper:([A-Z]{2}):events/);
        const state = stateMatch ? stateMatch[1] : null;
        
        // Calculate cache info
        const now = Date.now();
        const ageSeconds = entry.age;
        const ttlSeconds = entry.ttl;
        const expiresIn = ttlSeconds > 0 ? ttlSeconds : 0;
        
        // Format age as human-readable
        let ageDisplay = '';
        if (ageSeconds < 60) {
          ageDisplay = `${Math.floor(ageSeconds)}s`;
        } else if (ageSeconds < 3600) {
          ageDisplay = `${Math.floor(ageSeconds / 60)}m`;
        } else if (ageSeconds < 86400) {
          ageDisplay = `${Math.floor(ageSeconds / 3600)}h`;
        } else {
          ageDisplay = `${Math.floor(ageSeconds / 86400)}d`;
        }

        // Format TTL
        let ttlDisplay = '';
        if (ttlSeconds <= 0) {
          ttlDisplay = 'expired';
        } else if (ttlSeconds < 60) {
          ttlDisplay = `${Math.floor(ttlSeconds)}s`;
        } else if (ttlSeconds < 3600) {
          ttlDisplay = `${Math.floor(ttlSeconds / 60)}m`;
        } else if (ttlSeconds < 86400) {
          ttlDisplay = `${Math.floor(ttlSeconds / 3600)}h`;
        } else {
          ttlDisplay = `${Math.floor(ttlSeconds / 86400)}d`;
        }

        // Estimate size (rough calculation)
        const dataSize = JSON.stringify(entry.data).length;
        let sizeDisplay = '';
        if (dataSize < 1024) {
          sizeDisplay = `${dataSize}B`;
        } else if (dataSize < 1024 * 1024) {
          sizeDisplay = `${Math.round(dataSize / 1024)}KB`;
        } else {
          sizeDisplay = `${Math.round(dataSize / 1024 / 1024 * 10) / 10}MB`;
        }

        // Count events in cache
        const eventCount = Array.isArray(entry.data) ? entry.data.length : 0;

        return {
          state,
          exists: true,
          age: ageSeconds,
          ageDisplay,
          ttl: ttlSeconds,
          ttlDisplay,
          expiresIn,
          size: dataSize,
          sizeDisplay,
          eventCount,
          isExpired: ttlSeconds <= 0
        };
      })
      .filter(cache => cache.state !== null);

    // If specific state requested, return only that state
    if (stateCode) {
      const stateCache = scraperCaches.find(c => c.state === stateCode);
      
      if (stateCache) {
        return new Response(JSON.stringify(stateCache), {
          headers: corsHeaders
        });
      } else {
        return new Response(JSON.stringify({
          state: stateCode,
          exists: false,
          age: null,
          ttl: null,
          eventCount: 0,
          message: 'No cache found'
        }), {
          headers: corsHeaders
        });
      }
    }

    // Return all states with cache info
    const cacheStats = CacheManager.getStats();
    
    return new Response(JSON.stringify({
      caches: scraperCaches,
      totalCaches: scraperCaches.length,
      stats: {
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        hitRate: cacheStats.hitRate,
        totalFiles: cacheStats.size
      }
    }), {
      headers: corsHeaders
    });

  } catch (error: any) {
    console.error('Error getting cache info:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Failed to get cache info'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
