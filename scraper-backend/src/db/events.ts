/**
 * Event Database Operations
 * 
 * Handles inserting scraped events and bills into PostgreSQL
 */

import { getPool } from './connection.js';
import crypto from 'crypto';
import type { LegislativeEvent, Bill } from '../../../lib/functions/utils/scrapers/types.js';

/**
 * Generate fingerprint for event deduplication
 */
function generateFingerprint(event: LegislativeEvent): string {
  const key = `${event.name}-${event.date}-${event.location}-${event.state}`;
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Normalize time format for PostgreSQL TIME type
 */
function normalizeTime(time: string | undefined): string | null {
  if (!time) return null;
  
  // Remove extra spaces and convert to lowercase
  time = time.trim().toLowerCase();
  
  // Handle formats like "10:00 a.m." or "2:30 pm"
  const match = time.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (!match) return null;
  
  let hours = parseInt(match[1]);
  const minutes = match[2];
  const period = match[3];
  
  // Convert to 24-hour format
  if (period === 'pm' && hours !== 12) {
    hours += 12;
  } else if (period === 'am' && hours === 12) {
    hours = 0;
  }
  
  return `${hours.toString().padStart(2, '0')}:${minutes}:00`;
}

/**
 * Insert event into database
 */
export async function insertEvent(event: LegislativeEvent): Promise<string> {
  const pool = getPool();
  const fingerprint = generateFingerprint(event);
  const normalizedTime = normalizeTime(event.time);

  const query = `
    INSERT INTO events (
      id, name, date, time, location, lat, lng,
      level, type, state_code, committee, description,
      details_url, docket_url, agenda_url, virtual_meeting_url,
      source_url, allows_public_participation, chamber,
      scraper_source, fingerprint
    ) VALUES (
      gen_random_uuid(), $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11,
      $12, $13, $14, $15,
      $16, $17, $18,
      $19, $20
    )
    ON CONFLICT (fingerprint) DO NOTHING
    RETURNING id
  `;

  const values = [
    event.name,
    event.date,
    normalizedTime,
    event.location,
    event.lat,
    event.lng,
    event.level,
    event.type,
    event.state,
    event.committee || null,
    event.description || null,
    event.detailsUrl || null,
    event.docketUrl || null,
    event.agendaUrl || null,
    event.virtualMeetingUrl || null,
    event.sourceUrl || null,
    event.allowsPublicParticipation || false,
    event.chamber || null,
    `${event.state}-scraper`,
    fingerprint
  ];

  const result = await pool.query(query, values);
  
  if (result.rows.length === 0) {
    throw new Error('Event already exists (duplicate fingerprint)');
  }
  
  return result.rows[0].id;
}

/**
 * Insert bills associated with an event
 */
export async function insertBills(eventId: string, bills: Bill[]): Promise<void> {
  const pool = getPool();
  
  for (const bill of bills) {
    const query = `
      INSERT INTO bills (
        id, event_id, bill_number, title, sponsors, summary, status
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6
      )
      ON CONFLICT DO NOTHING
    `;

    const values = [
      eventId,
      bill.billNumber,
      bill.title || null,
      bill.sponsors ? JSON.stringify(bill.sponsors) : null,
      bill.summary || null,
      bill.status || null
    ];

    await pool.query(query, values);
  }
}

/**
 * Log scraper health metrics
 */
export async function logScraperHealth(
  state: string,
  success: boolean,
  eventsCount: number,
  error: string | null
): Promise<void> {
  const pool = getPool();
  
  const query = `
    INSERT INTO scraper_health (
      state_code, success, events_found, error_message, scraped_at
    ) VALUES (
      $1, $2, $3, $4, NOW()
    )
  `;

  await pool.query(query, [state, success, eventsCount, error]);
}
