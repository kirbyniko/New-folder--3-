/**
 * Force Rescrape API - Immediately scrape a state (bypass cache)
 * 
 * Usage: POST /api/rescrape?state=CA
 * 
 * This will:
 * 1. Delete existing cache
 * 2. Run the scraper
 * 3. Return fresh events
 */

import { ScraperRegistry, CacheManager, initializeScrapers } from '../../netlify/functions/utils/scrapers/index';

let scrapersInitialized = false;

export async function onRequest(context: any) {
  const { request } = context;
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    // Initialize scrapers on first request
    if (!scrapersInitialized) {
      await initializeScrapers();
      scrapersInitialized = true;
    }

    const url = new URL(request.url);
    const stateCode = url.searchParams.get('state')?.toUpperCase();

    if (!stateCode) {
      return new Response(JSON.stringify({
        error: 'State code required (e.g., ?state=CA)'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    console.log(`🔄 Force rescraping ${stateCode}...`);

    // Get scraper
    const scraper = ScraperRegistry.get(stateCode);
    
    if (!scraper) {
      return new Response(JSON.stringify({
        success: false,
        state: stateCode,
        error: 'No scraper available for this state',
        eventsFound: 0
      }), {
        status: 404,
        headers: corsHeaders
      });
    }

    // Delete existing cache
    const cacheKey = `scraper:${stateCode}:events`;
    const hadCache = CacheManager.has(cacheKey);
    if (hadCache) {
      CacheManager.delete(cacheKey);
      console.log(`🗑️ Deleted existing cache for ${stateCode}`);
    }

    // Run scraper
    const startTime = Date.now();
    const events = await scraper.scrape();
    const duration = Date.now() - startTime;

    console.log(`✅ Scraped ${events.length} events for ${stateCode} in ${duration}ms`);

    // Store in cache (24 hours TTL)
    if (events.length > 0) {
      CacheManager.set(cacheKey, events, 86400);
      console.log(`💾 Cached ${events.length} events for ${stateCode}`);
    }

    return new Response(JSON.stringify({
      success: true,
      state: stateCode,
      eventsFound: events.length,
      duration,
      cached: events.length > 0,
      hadPreviousCache: hadCache,
      message: `Successfully scraped ${events.length} events for ${stateCode}`
    }), {
      headers: corsHeaders
    });

  } catch (error: any) {
    console.error('Error force rescraping:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to rescrape',
      stack: error.stack
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
