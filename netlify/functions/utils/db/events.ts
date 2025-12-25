import { getPool } from './connection';
import { LegislativeEvent, BillInfo } from '../../../../src/types/event';
import crypto from 'crypto';
import { autoTagEvent } from './tagging.js';

/**
 * Generate a fingerprint for deduplication
 * Uses name, date, and location to create unique hash
 */
function createFingerprint(event: LegislativeEvent): string {
  const data = `${event.name}|${event.date}|${event.location || ''}|${event.lat}|${event.lng}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 64);
}

/**
 * Generate external ID if not provided
 */
function generateExternalId(event: LegislativeEvent): string {
  const data = `${event.name}|${event.date}|${event.location || ''}|${Date.now()}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
}

/**
 * Insert or update an event in the database
 */
export async function insertEvent(event: LegislativeEvent, scraperSource: string): Promise<string> {
  const pool = getPool();
  
  const fingerprint = createFingerprint(event);
  const externalId = (event as any).externalId || generateExternalId(event);
  
  // Parse date properly
  let eventDate: Date;
  if (event.date instanceof Date) {
    eventDate = event.date;
  } else if (typeof event.date === 'string') {
    eventDate = new Date(event.date);
  } else {
    eventDate = new Date();
  }
  
  // Parse time if available
  let eventTime: string | null = null;
  if (event.time) {
    eventTime = event.time;
  } else if (eventDate.getHours() !== 0 || eventDate.getMinutes() !== 0) {
    eventTime = `${String(eventDate.getHours()).padStart(2, '0')}:${String(eventDate.getMinutes()).padStart(2, '0')}:00`;
  }
  
  const query = `
    INSERT INTO events (
      level, state_code, name, date, time,
      lat, lng, location_name, location_address, description,
      committee_name, type, details_url, docket_url, virtual_meeting_url, source_url,
      allows_public_participation,
      scraper_source, external_id, fingerprint
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
    ON CONFLICT (scraper_source, external_id) 
    DO UPDATE SET
      last_updated = NOW(),
      scraper_source = COALESCE(EXCLUDED.scraper_source, events.scraper_source),
      external_id = COALESCE(EXCLUDED.external_id, events.external_id),
      name = EXCLUDED.name,
      date = EXCLUDED.date,
      time = EXCLUDED.time,
      location_name = EXCLUDED.location_name,
      description = EXCLUDED.description,
      details_url = EXCLUDED.details_url,
      docket_url = EXCLUDED.docket_url,
      virtual_meeting_url = EXCLUDED.virtual_meeting_url,
      source_url = EXCLUDED.source_url
    RETURNING id
  `;
  
  const values = [
    event.level || 'state',
    event.state?.toUpperCase() || null,
    event.name,
    eventDate,
    eventTime,
    event.lat,
    event.lng,
    event.location || null,
    (event as any).locationAddress || null,
    event.description || null,
    event.committee || null,
    event.type || null,
    event.detailsUrl || (event as any).url || null, // Map both detailsUrl and url
    event.docketUrl || null,
    event.virtualMeetingUrl || null,
    (event as any).sourceUrl || null,
    (event as any).allowsPublicParticipation || false,
    scraperSource,
    externalId,
    fingerprint
  ];
  
  try {
    const result = await pool.query(query, values);
    const eventId = result.rows[0].id;
    
    // Auto-generate and insert tags
    const tags = autoTagEvent({
      name: event.name,
      description: event.description || null,
      committee: event.committee || null
    });
    
    if (tags.length > 0) {
      await insertTags(eventId, tags);
    }
    
    return eventId;
  } catch (err: any) {
    console.error('❌ Error inserting event:', err.message);
    throw err;
  }
}

/**
 * Insert bills and link them to an event
 */
export async function insertBills(eventId: string, bills: BillInfo[], stateCode: string): Promise<void> {
  const pool = getPool();
  
  for (const bill of bills) {
    try {
      // Insert or update bill
      const billQuery = `
        INSERT INTO bills (state_code, bill_number, title, description, url, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (state_code, bill_number) DO UPDATE SET
          title = COALESCE(EXCLUDED.title, bills.title),
          description = COALESCE(EXCLUDED.description, bills.description),
          url = COALESCE(EXCLUDED.url, bills.url),
          status = COALESCE(EXCLUDED.status, bills.status)
        RETURNING id
      `;
      
      const billResult = await pool.query(billQuery, [
        stateCode.toUpperCase(),
        bill.id, // Bill.id contains the bill number (e.g. "AB 123", "SB 456")
        bill.title || null,
        bill.description || null,
        bill.url || null,
        bill.status || null
      ]);
      
      const billId = billResult.rows[0].id;
      
      // Link event to bill
      await pool.query(`
        INSERT INTO event_bills (event_id, bill_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [eventId, billId]);
    } catch (err: any) {
      console.error(`❌ Error inserting bill ${bill.id}:`, err.message);
    }
  }
}

/**
 * Insert tags for an event
 */
export async function insertTags(eventId: string, tags: string[]): Promise<void> {
  const pool = getPool();
  
  for (const tag of tags) {
    try {
      await pool.query(`
        INSERT INTO event_tags (event_id, tag)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [eventId, tag]);
    } catch (err: any) {
      console.error(`❌ Error inserting tag ${tag}:`, err.message);
    }
  }
}

/**
 * Get events for a state
 */
export async function getStateEvents(stateCode: string): Promise<LegislativeEvent[]> {
  const pool = getPool();
  
  const query = `
    SELECT 
      e.*,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'number', b.bill_number,
            'title', b.title,
            'url', b.url,
            'status', b.status
          )
        ) FILTER (WHERE b.id IS NOT NULL),
        '[]'::json
      ) as bills,
      COALESCE(
        array_agg(DISTINCT et.tag) FILTER (WHERE et.tag IS NOT NULL),
        ARRAY[]::text[]
      ) as tags
    FROM events e
    LEFT JOIN event_bills eb ON e.id = eb.event_id
    LEFT JOIN bills b ON eb.bill_id = b.id
    LEFT JOIN event_tags et ON e.id = et.event_id
    WHERE e.state_code = $1
      AND e.date >= CURRENT_DATE - INTERVAL '7 days'
      AND e.date <= CURRENT_DATE + INTERVAL '90 days'
    GROUP BY e.id
    ORDER BY e.date, e.time NULLS LAST
  `;
  
  try {
    const result = await pool.query(query, [stateCode.toUpperCase()]);
    return result.rows.map(transformToFrontendFormat);
  } catch (err: any) {
    console.error('❌ Error getting state events:', err.message);
    throw err;
  }
}

/**
 * Get events near a location
 */
export async function getEventsNearLocation(
  lat: number, 
  lng: number, 
  radiusMiles: number
): Promise<LegislativeEvent[]> {
  const pool = getPool();
  
  const query = `
    SELECT 
      e.*,
      (
        3959 * acos(
          cos(radians($1)) * cos(radians(e.lat)) * 
          cos(radians(e.lng) - radians($2)) + 
          sin(radians($1)) * sin(radians(e.lat))
        )
      ) AS distance,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'number', b.bill_number,
            'title', b.title,
            'url', b.url,
            'status', b.status
          )
        ) FILTER (WHERE b.id IS NOT NULL),
        '[]'::json
      ) as bills,
      COALESCE(
        array_agg(DISTINCT et.tag) FILTER (WHERE et.tag IS NOT NULL),
        ARRAY[]::text[]
      ) as tags
    FROM events e
    LEFT JOIN event_bills eb ON e.id = eb.event_id
    LEFT JOIN bills b ON eb.bill_id = b.id
    LEFT JOIN event_tags et ON e.id = et.event_id
    WHERE e.date >= CURRENT_DATE
      AND e.date <= CURRENT_DATE + INTERVAL '90 days'
    GROUP BY e.id
    HAVING (
      3959 * acos(
        cos(radians($1)) * cos(radians(e.lat)) * 
        cos(radians(e.lng) - radians($2)) + 
        sin(radians($1)) * sin(radians(e.lat))
      )
    ) <= $3
    ORDER BY distance, e.date, e.time NULLS LAST
  `;
  
  try {
    const result = await pool.query(query, [lat, lng, radiusMiles]);
    return result.rows.map(transformToFrontendFormat);
  } catch (err: any) {
    console.error('❌ Error getting nearby events:', err.message);
    throw err;
  }
}

/**
 * Transform database row to frontend format
 */
function transformToFrontendFormat(row: any): LegislativeEvent {
  return {
    id: row.id,
    name: row.name,
    date: row.date,
    time: row.time || undefined,
    location: row.location_name || undefined,
    lat: parseFloat(row.lat),
    lng: parseFloat(row.lng),
    level: row.level,
    type: row.type || undefined,
    committee: row.committee_name || undefined,
    description: row.description || undefined,
    detailsUrl: row.details_url || undefined,
    docketUrl: row.docket_url || undefined,
    virtualMeetingUrl: row.virtual_meeting_url || undefined,
    bills: Array.isArray(row.bills) && row.bills.length > 0 ? row.bills : undefined,
    tags: Array.isArray(row.tags) && row.tags.length > 0 ? row.tags : undefined,
  };
}

/**
 * Log scraper health
 */
export async function logScraperHealth(
  scraperName: string,
  stateCode: string | null,
  status: 'success' | 'failure' | 'timeout',
  eventsScraped: number,
  errorMessage?: string,
  durationMs?: number
): Promise<void> {
  const pool = getPool();
  
  try {
    await pool.query(`
      INSERT INTO scraper_health (
        scraper_name, state_code, status, events_scraped, error_message, duration_ms
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      scraperName,
      stateCode?.toUpperCase() || null,
      status,
      eventsScraped,
      errorMessage || null,
      durationMs || null
    ]);
  } catch (err: any) {
    console.error('❌ Error logging scraper health:', err.message);
  }
}

/**
 * Get top 100 prioritized events happening today
 * Prioritizes by:
 * 1. Events with bills
 * 2. Events allowing public participation
 * 3. Events with tags
 * 4. Then by date/time
 */
export async function getTop100EventsToday(): Promise<LegislativeEvent[]> {
  const pool = getPool();
  
  const query = `
    SELECT 
      e.*,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'number', b.bill_number,
            'title', b.title,
            'url', b.url,
            'status', b.status
          )
        ) FILTER (WHERE b.id IS NOT NULL),
        '[]'::json
      ) as bills,
      COALESCE(
        array_agg(DISTINCT et.tag) FILTER (WHERE et.tag IS NOT NULL),
        ARRAY[]::text[]
      ) as tags,
      -- Priority scoring
      (
        CASE WHEN EXISTS (SELECT 1 FROM event_bills eb WHERE eb.event_id = e.id) THEN 100 ELSE 0 END +
        CASE WHEN e.allows_public_participation = true THEN 50 ELSE 0 END +
        CASE WHEN EXISTS (SELECT 1 FROM event_tags et2 WHERE et2.event_id = e.id) THEN 25 ELSE 0 END
      ) as priority_score
    FROM events e
    LEFT JOIN event_bills eb ON e.id = eb.event_id
    LEFT JOIN bills b ON eb.bill_id = b.id
    LEFT JOIN event_tags et ON e.id = et.event_id
    WHERE e.date >= CURRENT_DATE
      AND e.date <= CURRENT_DATE + INTERVAL '90 days'
    GROUP BY e.id
    ORDER BY 
      priority_score DESC,
      e.date ASC,
      e.time NULLS LAST
    LIMIT 100
  `;
  
  try {
    const result = await pool.query(query);
    return result.rows.map(transformToFrontendFormat);
  } catch (err: any) {
    console.error('❌ Error getting top 100 events:', err.message);
    throw err;
  }
}

/**
 * Count total events scheduled for today and near future
 */
export async function countEventsToday(): Promise<number> {
  const pool = getPool();
  
  try {
    const result = await pool.query(`
      SELECT COUNT(*) as count 
      FROM events 
      WHERE date >= CURRENT_DATE
        AND date <= CURRENT_DATE + INTERVAL '90 days'
    `);
    return parseInt(result.rows[0].count, 10);
  } catch (err: any) {
    console.error('❌ Error counting events:', err.message);
    throw err;
  }
}

/**
 * Get all events for a state from database (for blob export)
 * This is the single source of truth for frontend data
 */
export async function getAllStateEventsForExport(stateCode: string): Promise<LegislativeEvent[]> {
  const pool = getPool();
  
  const query = `
    SELECT 
      e.id,
      e.name,
      e.date,
      e.time,
      e.lat,
      e.lng,
      e.location_name,
      e.location_address,
      e.level,
      e.type,
      e.state_code,
      e.city,
      e.zip_code,
      e.committee_name,
      e.description,
      e.details_url,
      e.docket_url,
      e.virtual_meeting_url,
      e.allows_public_participation,
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
      COALESCE(
        array_agg(DISTINCT et.tag) FILTER (WHERE et.tag IS NOT NULL),
        ARRAY[]::text[]
      ) as tags
    FROM events e
    LEFT JOIN event_bills eb ON e.id = eb.event_id
    LEFT JOIN bills b ON eb.bill_id = b.id
    LEFT JOIN event_tags et ON e.id = et.event_id
    WHERE e.state_code = $1
      AND e.date >= CURRENT_DATE - INTERVAL '7 days'
      AND e.date <= CURRENT_DATE + INTERVAL '90 days'
    GROUP BY e.id
    ORDER BY e.date ASC, e.time NULLS LAST
  `;
  
  try {
    const result = await pool.query(query, [stateCode.toUpperCase()]);
    
    // Transform to frontend format
    return result.rows.map(row => {
      const bills = Array.isArray(row.bills) && row.bills[0] !== null 
        ? row.bills.filter((b: any) => b.id !== null)
        : [];
      
      const tags = Array.isArray(row.tags) && row.tags[0] !== null 
        ? row.tags.filter((t: any) => t !== null)
        : [];
      
      return {
        id: row.id,
        name: row.name,
        date: row.date,
        time: row.time || undefined,
        location: row.location_name || undefined,
        lat: parseFloat(row.lat),
        lng: parseFloat(row.lng),
        state: row.state_code,
        city: row.city || undefined,
        zipCode: row.zip_code || undefined,
        level: row.level,
        type: row.type || undefined,
        committee: row.committee_name || undefined,
        description: row.description || undefined,
        detailsUrl: row.details_url || undefined,
        docketUrl: row.docket_url || undefined,
        virtualMeetingUrl: row.virtual_meeting_url || undefined,
        allowsPublicParticipation: row.allows_public_participation || false,
        bills: bills.length > 0 ? bills : undefined,
        tags: tags.length > 0 ? tags : undefined,
      } as LegislativeEvent;
    });
  } catch (err: any) {
    console.error(`❌ Error getting events for ${stateCode}:`, err.message);
    throw err;
  }
}
