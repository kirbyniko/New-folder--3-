import { Handler } from '@netlify/functions';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * Fast cached API endpoint for state legislative events
 * Serves pre-scraped JSON from daily scheduled function
 * Falls back to live scraping only if cache is missing/stale
 */
export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=21600' // 6 hours
  };

  try {
    const state = event.queryStringParameters?.state?.toUpperCase();
    
    if (!state) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'State parameter is required' })
      };
    }

    const cachePath = join(process.cwd(), 'public', 'cache', `state-${state.toLowerCase()}.json`);
    
    // Check if cached file exists
    if (existsSync(cachePath)) {
      const cacheData = await readFile(cachePath, 'utf-8');
      const cachedResult = JSON.parse(cacheData);
      
      // Check if cache is fresh (less than 24 hours old)
      const cacheAge = Date.now() - new Date(cachedResult.lastUpdated || 0).getTime();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (cacheAge < maxAge) {
        console.log(`✅ Serving ${state} from cache (age: ${Math.round(cacheAge / 1000 / 60)} minutes)`);
        return {
          statusCode: 200,
          headers: {
            ...headers,
            'X-Cache': 'HIT',
            'X-Cache-Age': Math.round(cacheAge / 1000 / 60).toString()
          },
          body: cacheData
        };
      }
      
      console.log(`⚠️ ${state} cache is stale, falling back to live scraping`);
    }

    // Fallback: Import and run original scraper
    console.log(`🔄 Live scraping ${state} (no cache available)`);
    const { handler: originalHandler } = await import('./state-events');
    const result = await originalHandler(event, {} as any);
    
    return {
      ...result,
      headers: {
        ...headers,
        'X-Cache': 'MISS'
      }
    };

  } catch (error: any) {
    console.error('Error serving state data:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch state data',
        message: error.message
      })
    };
  }
};
