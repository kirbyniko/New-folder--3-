import type { Handler } from '@netlify/functions';
import { loadEnvFile } from './utils/env-loader.js';
import { ScraperRegistry, initializeScrapers } from './utils/scrapers/index.js';

// Initialize scrapers once (singleton pattern)
let scrapersInitialized = false;

/**
 * Streaming endpoint for state events
 * Returns events progressively as they are enriched
 */
export const handler: Handler = async (event) => {
  loadEnvFile();
  console.log('🔄 STATE-EVENTS-STREAM: Request received');
  
  // Initialize scrapers on first request
  if (!scrapersInitialized) {
    await initializeScrapers();
    scrapersInitialized = true;
  }
  
  const stateAbbr = event.queryStringParameters?.state?.toUpperCase();
  
  if (!stateAbbr) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({ 
        error: 'Valid state abbreviation required',
        message: 'Please provide a valid 2-letter US state abbreviation'
      })
    };
  }

  try {
    const scraper = ScraperRegistry.get(stateAbbr);
    
    if (!scraper) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: 'No scraper available for state',
          state: stateAbbr 
        })
      };
    }

    // Fetch events (with enrichment)
    const events = await scraper.fetchEvents();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=21600', // 6 hours
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(events)
    };

  } catch (error) {
    console.error('Stream error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
