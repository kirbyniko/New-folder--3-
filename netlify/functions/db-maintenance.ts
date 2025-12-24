/**
 * Database Maintenance Utility
 * Run this in production to reset and repopulate with uniform tagging
 * 
 * Usage: Call /.netlify/functions/db-maintenance?action=reset&key=YOUR_SECRET_KEY
 */

import type { Handler } from '@netlify/functions';
import { getPool } from './utils/db/connection.js';
import { ScraperRegistry } from './utils/scrapers/index.js';
import { insertEvent, insertBills, insertTags } from './utils/db/events.js';

export const handler: Handler = async (event) => {
  // SECURITY: Disable in production - use Netlify CLI for maintenance
  if (process.env.NETLIFY && !process.env.NETLIFY_DEV) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Not found' })
    };
  }

  const action = event.queryStringParameters?.action;
  const apiKey = event.queryStringParameters?.key;
  
  // Require strong API key (min 32 characters)
  const maintenanceKey = process.env.DB_MAINTENANCE_KEY;
  if (!maintenanceKey || maintenanceKey.length < 32) {
    console.error('⚠️ DB_MAINTENANCE_KEY not set or too weak (min 32 chars)');
    return {
      statusCode: 503,
      body: JSON.stringify({ error: 'Service unavailable - maintenance key not configured' })
    };
  }
  
  if (!apiKey || apiKey !== maintenanceKey) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }
  
  if (action === 'reset') {
    return await resetAndRescrape();
  } else if (action === 'retag') {
    return await retagExisting();
  } else if (action === 'stats') {
    return await getStats();
  }
  
  return {
    statusCode: 400,
    body: JSON.stringify({ 
      error: 'Invalid action',
      availableActions: ['reset', 'retag', 'stats']
    })
  };
};

async function resetAndRescrape() {
  const pool = getPool();
  const log: string[] = [];
  
  try {
    log.push('🗑️ Clearing existing data...');
    await pool.query('DELETE FROM event_tags');
    await pool.query('DELETE FROM event_bills');
    await pool.query('DELETE FROM bills');
    await pool.query('DELETE FROM events');
    log.push('✅ Database cleared');
    
    log.push('\n🕷️ Re-scraping states...');
    const states = ['CA', 'PA']; // Add more as needed
    let totalEvents = 0;
    let totalTags = 0;
    let publicParticipationCount = 0;
    
    for (const state of states) {
      const scraper = ScraperRegistry.get(state);
      if (!scraper) continue;
      
      log.push(`\nScraping ${state}...`);
      const events = await scraper.scrape();
      log.push(`  Found ${events.length} events`);
      
      for (const evt of events) {
        // insertEvent now auto-generates and inserts tags
        const eventId = await insertEvent(evt, `scraper-${state.toLowerCase()}`);
        
        if (evt.bills?.length) {
          await insertBills(eventId, evt.bills, state);
        }
        
        if ((evt as any).allowsPublicParticipation) {
          publicParticipationCount++;
        }
        
        totalEvents++;
      }
    }
    
    log.push(`\n✅ Reset complete!`);
    log.push(`   Events: ${totalEvents}`);
    log.push(`   Tags: ${totalTags}`);
    log.push(`   Public Participation: ${publicParticipationCount}`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        log: log.join('\n'),
        stats: { totalEvents, totalTags, publicParticipationCount }
      })
    };
    
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        log: log.join('\n')
      })
    };
  }
}

async function retagExisting() {
  const pool = getPool();
  const { autoTagEvent } = await import('./utils/tagging.js');
  
  try {
    // Get all events
    const result = await pool.query(`
      SELECT id, name, description, committee_name, location_name
      FROM events
    `);
    
    let taggedCount = 0;
    
    for (const event of result.rows) {
      // Clear existing tags
      await pool.query('DELETE FROM event_tags WHERE event_id = $1', [event.id]);
      
      // Generate new tags
      const tags = autoTagEvent({
        name: event.name,
        description: event.description,
        committee: event.committee_name,
        location: event.location_name
      });
      
      // Insert new tags
      for (const tag of tags) {
        await pool.query(`
          INSERT INTO event_tags (event_id, tag)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [event.id, tag]);
      }
      
      taggedCount++;
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `Re-tagged ${taggedCount} events`
      })
    };
    
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
}

async function getStats() {
  const pool = getPool();
  
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE allows_public_participation = true) as public_participation,
        (SELECT COUNT(*) FROM bills) as total_bills,
        (SELECT COUNT(*) FROM event_tags) as total_tags,
        (SELECT COUNT(DISTINCT event_id) FROM event_tags) as events_with_tags
      FROM events
    `);
    
    const tagDist = await pool.query(`
      SELECT tag, COUNT(*) as count
      FROM event_tags
      GROUP BY tag
      ORDER BY count DESC
      LIMIT 10
    `);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        stats: result.rows[0],
        topTags: tagDist.rows
      })
    };
    
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
}
