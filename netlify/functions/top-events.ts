import { Handler } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { getTop100EventsToday } from './utils/db/events.js';
import { checkDatabaseConnection } from './utils/db/connection.js';

/**
 * API endpoint to get top 100 prioritized events happening today
 * 
 * Prioritization:
 * 1. Events with bills attached (100 points)
 * 2. Events allowing public participation (50 points)
 * 3. Events with tags (25 points)
 * 4. Then sorted by date/time
 * 
 * Returns cached data from Netlify Blobs if available, 
 * otherwise queries PostgreSQL directly
 * 
 * NOTE: This endpoint ONLY queries the database. 
 * Scraping is handled by scheduled-scraper.ts (runs daily at 3 AM UTC)
 */
export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const usePostgres = process.env.USE_POSTGRESQL === 'true';
    
    // In local dev, Netlify Blobs aren't available - query PostgreSQL directly
    const isLocalDev = !process.env.NETLIFY;
    
    if (isLocalDev) {
      // Local development: Query PostgreSQL directly (NO SCRAPING)
      if (usePostgres) {
        const dbAvailable = await checkDatabaseConnection();
        
        if (dbAvailable) {
          console.log('📊 Querying top 100 events from database (local dev)...');
          const topEvents = await getTop100EventsToday();
          
          return {
            statusCode: 200,
            headers: {
              ...headers,
              'Cache-Control': 'public, max-age=3600', // 1 hour
              'X-Data-Source': 'postgresql'
            },
            body: JSON.stringify({
              events: topEvents,
              count: topEvents.length,
              source: 'postgresql',
              lastUpdated: new Date().toISOString(),
              prioritization: 'bills > public_participation > tags > date/time',
              localDev: true
            }),
          };
        }
      }
      
      // Fallback if PostgreSQL not available in local dev
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({
          error: 'PostgreSQL not configured',
          message: 'Set USE_POSTGRESQL=true in .env and ensure database is running'
        }),
      };
    }
    
    // Production: Use Netlify Blobs for caching
    const store = getStore('events');
    
    // Try to get cached data from Blobs first
    let cachedData: string | null = null;
    try {
      cachedData = await store.get('top-100-events', { type: 'text' });
    } catch (err) {
      console.log('No cached data found, will query database');
    }

    // If we have recent cached data, return it
    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      const cacheAge = Date.now() - new Date(parsed.lastUpdated).getTime();
      const oneHour = 60 * 60 * 1000;
      
      // Cache is fresh (less than 1 hour old)
      if (cacheAge < oneHour) {
        console.log(`✅ Returning cached top 100 events (${parsed.count} events, ${Math.round(cacheAge / 60000)}m old)`);
        return {
          statusCode: 200,
          headers: {
            ...headers,
            'Cache-Control': 'public, max-age=3600',
            'X-Cache': 'HIT',
            'X-Data-Source': 'netlify-blobs'
          },
          body: JSON.stringify({
            ...parsed,
            cached: true,
            cacheAgeMinutes: Math.round(cacheAge / 60000)
          }),
        };
      }
    }

    // Cache miss or stale - query PostgreSQL if available
    if (usePostgres) {
      const dbAvailable = await checkDatabaseConnection();
      
      if (dbAvailable) {
        console.log('📊 Querying PostgreSQL for top 100 events...');
        const topEvents = await getTop100EventsToday();
        
        return {
          statusCode: 200,
          headers: {
            ...headers,
            'Cache-Control': 'public, max-age=3600',
            'X-Cache': 'MISS',
            'X-Data-Source': 'postgresql'
          },
          body: JSON.stringify({
            events: topEvents,
            count: topEvents.length,
            source: 'postgresql',
            lastUpdated: new Date().toISOString(),
            prioritization: 'bills > public_participation > tags > date/time'
          }),
        };
      }
    }

    // Fallback: No data available
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        events: [],
        count: 0,
        source: 'none',
        message: 'No data available. Database empty or not configured. Run scheduled-scraper to populate.'
      }),
    };
    
  } catch (error) {
    console.error('Error in top-events:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch top events',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};
