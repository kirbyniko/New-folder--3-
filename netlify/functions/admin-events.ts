import { Handler } from '@netlify/functions';
import { getPool } from './utils/db/connection.js';

/**
 * Admin endpoint to view all events in database
 * For data integrity verification
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
    const pool = getPool();
    const params = event.queryStringParameters || {};
    
    // Build query with filters
    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (params.state) {
      whereConditions.push(`e.state_code = $${paramIndex}`);
      queryParams.push(params.state.toUpperCase());
      paramIndex++;
    }

    if (params.level) {
      whereConditions.push(`e.level = $${paramIndex}`);
      queryParams.push(params.level);
      paramIndex++;
    }

    if (params.date) {
      whereConditions.push(`e.date = $${paramIndex}`);
      queryParams.push(params.date);
      paramIndex++;
    }

    if (params.startDate) {
      whereConditions.push(`e.date >= $${paramIndex}`);
      queryParams.push(params.startDate);
      paramIndex++;
    }

    if (params.endDate) {
      whereConditions.push(`e.date <= $${paramIndex}`);
      queryParams.push(params.endDate);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    const limit = parseInt(params.limit || '100');
    const offset = parseInt(params.offset || '0');

    // Query events with all details
    const query = `
      SELECT 
        e.id,
        e.name,
        e.date,
        e.time,
        e.location_name as location,
        e.location_address,
        e.lat,
        e.lng,
        e.level,
        e.type,
        e.state_code as state,
        e.city,
        e.zip_code as "zipCode",
        e.committee_name as committee,
        e.description,
        e.details_url as "detailsUrl",
        e.docket_url as "docketUrl",
        e.agenda_url as "agendaUrl",
        e.virtual_meeting_url as "virtualMeetingUrl",
        e.source_url as "sourceUrl",
        e.allows_public_participation as "allowsPublicParticipation",
        e.chamber,
        e.scraper_source as "scraperSource",
        e.scraped_at as "scrapedAt",
        e.last_updated as "lastUpdated",
        -- Aggregate bills
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', b.bill_number,
              'number', b.bill_number,
              'title', b.title,
              'url', b.url,
              'status', b.status
            )
          ) FILTER (WHERE b.id IS NOT NULL),
          '[]'::json
        ) as bills,
        -- Aggregate tags
        COALESCE(
          array_agg(DISTINCT et.tag) FILTER (WHERE et.tag IS NOT NULL),
          ARRAY[]::text[]
        ) as tags
      FROM events e
      LEFT JOIN event_bills eb ON e.id = eb.event_id
      LEFT JOIN bills b ON eb.bill_id = b.id
      LEFT JOIN event_tags et ON e.id = et.event_id
      ${whereClause}
      GROUP BY e.id
      ORDER BY e.date DESC, e.time DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);
    
    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT e.id) as count
      FROM events e
      ${whereClause}
    `;
    
    const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
    const totalCount = parseInt(countResult.rows[0].count);

    // Clean up the data - filter out null bills and tags
    const cleanedEvents = result.rows.map(event => ({
      ...event,
      bills: Array.isArray(event.bills) && event.bills[0] !== null ? event.bills : [],
      tags: Array.isArray(event.tags) && event.tags[0] !== null ? event.tags.filter((t: any) => t !== null) : []
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        events: cleanedEvents,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount
        },
        filters: {
          state: params.state || null,
          level: params.level || null,
          date: params.date || null,
          startDate: params.startDate || null,
          endDate: params.endDate || null
        }
      }),
    };

  } catch (error: any) {
    console.error('❌ Error in admin-events:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};
