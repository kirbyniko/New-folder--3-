/**
 * Cache Invalidation API - Delete cache for a specific state
 * 
 * Usage: POST /api/invalidate-cache?state=CA
 */

import { CacheManager } from '../../netlify/functions/utils/scrapers/cache-manager';

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

    // Generate cache key for this state
    const cacheKey = `scraper:${stateCode}:events`;
    
    // Check if cache exists
    const exists = CacheManager.has(cacheKey);
    
    if (!exists) {
      return new Response(JSON.stringify({
        success: true,
        state: stateCode,
        message: 'No cache found for this state',
        existed: false
      }), {
        headers: corsHeaders
      });
    }

    // Delete the cache
    const deleted = CacheManager.delete(cacheKey);
    
    if (deleted) {
      console.log(`🗑️ Cache invalidated for ${stateCode}`);
      
      return new Response(JSON.stringify({
        success: true,
        state: stateCode,
        message: `Cache cleared for ${stateCode}`,
        existed: true
      }), {
        headers: corsHeaders
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        state: stateCode,
        error: 'Failed to delete cache'
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

  } catch (error: any) {
    console.error('Error invalidating cache:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to invalidate cache'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
