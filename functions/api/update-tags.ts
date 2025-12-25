/**
 * Cloudflare Pages Function: Update Event Tags
 * Endpoint: /api/update-tags
 * 
 * Auto-tag events based on keywords in titles/descriptions
 */

import { getSQL } from '../utils/db/connection.js';

const TAG_PATTERNS: Record<string, RegExp[]> = {
  'healthcare': [/health\s?care/i, /medicaid/i, /medicare/i, /hospital/i, /medical/i],
  'education': [/education/i, /school/i, /university/i, /college/i, /student/i],
  'transportation': [/transportation/i, /transit/i, /highway/i, /road/i, /bridge/i],
  'housing': [/housing/i, /affordable\s?housing/i, /rental/i, /tenant/i, /landlord/i],
  'budget': [/budget/i, /appropriations/i, /revenue/i, /tax/i, /fiscal/i],
  'environment': [/environment/i, /climate/i, /pollution/i, /conservation/i, /renewable/i],
  'criminal-justice': [/criminal/i, /sentencing/i, /police/i, /prison/i, /incarceration/i],
  'voting': [/voting/i, /election/i, /ballot/i, /voter/i, /electoral/i]
};

export async function onRequest(context: any) {
  const { request, env } = context;
  
  // Simple API key authentication
  const apiKey = request.headers.get('X-API-Key');
  if (apiKey !== env.ADMIN_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
  
  try {
    const sql = getSQL(context.env);
    
    // Get all events without tags
    const events = await sql`
      SELECT DISTINCT e.id, e.name, e.description
      FROM events e
      WHERE e.date >= CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1 FROM event_tags et WHERE et.event_id = e.id
      )
    `;
    
    let taggedCount = 0;
    
    for (const event of events) {
      const text = `${event.name} ${event.description || ''}`;
      const tags: string[] = [];
      
      // Check each tag pattern
      for (const [tag, patterns] of Object.entries(TAG_PATTERNS)) {
        if (patterns.some(pattern => pattern.test(text))) {
          tags.push(tag);
        }
      }
      
      // Insert tags
      for (const tag of tags) {
        await sql`
          INSERT INTO event_tags (event_id, tag) VALUES (${event.id}, ${tag}) ON CONFLICT DO NOTHING
        `;
      }
      
      if (tags.length > 0) {
        taggedCount++;
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        processedEvents: events.length,
        taggedEvents: taggedCount,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
    
  } catch (error) {
    console.error('Update tags error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Tag update failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}
