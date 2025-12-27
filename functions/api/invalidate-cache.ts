/**
 * Invalidate (delete) cache for a specific state
 */

interface Env {
  SCRAPER_CACHE: KVNamespace;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { SCRAPER_CACHE } = context.env;
  const url = new URL(context.request.url);
  const state = url.searchParams.get('state');
  
  if (!state) {
    return new Response(JSON.stringify({ error: 'State parameter required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    await SCRAPER_CACHE.delete(`scraper:${state}`);
    
    return new Response(JSON.stringify({ 
      success: true, 
      state,
      message: `Cache cleared for ${state}` 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Cache invalidation error:', error);
    return new Response(JSON.stringify({ error: 'Failed to invalidate cache' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
