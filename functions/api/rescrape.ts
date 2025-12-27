/**
 * Force rescrape for a specific state (clears cache and fetches fresh data)
 */

interface Env {
  SCRAPER_CACHE: KVNamespace;
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { SCRAPER_CACHE, DB } = context.env;
  const url = new URL(context.request.url);
  const state = url.searchParams.get('state');
  
  if (!state) {
    return new Response(JSON.stringify({ error: 'State parameter required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    // Clear cache first
    await SCRAPER_CACHE.delete(`scraper:${state}`);
    
    // Import and run the scraper
    const { ScraperRegistry, initializeScrapers } = await import('../../netlify/functions/utils/scrapers/index.js');
    
    initializeScrapers();
    const scraper = ScraperRegistry.get(state);
    
    if (!scraper) {
      return new Response(JSON.stringify({ 
        error: `No scraper found for state: ${state}` 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Run scraper
    const events = await scraper.scrape();
    
    // Cache results
    await SCRAPER_CACHE.put(
      `scraper:${state}`,
      JSON.stringify(events),
      {
        metadata: { timestamp: Date.now(), state },
        expirationTtl: 86400 // 24 hours
      }
    );
    
    return new Response(JSON.stringify({ 
      success: true,
      state,
      events: events.length,
      cached: true,
      timestamp: Date.now()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Rescrape error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to rescrape',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
