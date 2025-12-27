/**
 * Get cache information for all scrapers
 * Returns cache age and status for debugging
 */

interface Env {
  SCRAPER_CACHE: KVNamespace;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { SCRAPER_CACHE } = context.env;
  
  try {
    // List all cache keys
    const list = await SCRAPER_CACHE.list({ prefix: 'scraper:' });
    
    const caches = await Promise.all(
      list.keys.map(async (key) => {
        const metadata = key.metadata as { timestamp?: number; state?: string } | null;
        const state = key.name.replace('scraper:', '');
        
        return {
          state,
          exists: true,
          age: metadata?.timestamp 
            ? Math.floor((Date.now() - metadata.timestamp) / 1000 / 60) // minutes
            : null,
          timestamp: metadata?.timestamp || null
        };
      })
    );
    
    return new Response(JSON.stringify(caches), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Cache info error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch cache info' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
