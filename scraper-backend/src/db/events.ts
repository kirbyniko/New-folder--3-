/**
 * Event Database Operations
 * 
 * Handles inserting scraped events and bills into D1 via wrangler CLI
 */

import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
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
 * Normalize time format for D1 (SQLite)
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

function escapeSQL(str: string | undefined | null): string {
  if (!str) return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
}

/**
 * Execute SQL command on D1 via wrangler CLI
 */
function executeD1Command(sql: string): void {
  const tempFile = `temp-d1-${Date.now()}.sql`;
  try {
    writeFileSync(tempFile, sql);
    execSync(`wrangler d1 execute civitracker-db --remote --file="${tempFile}"`, {
      stdio: 'pipe'
    });
  } finally {
    try {
      unlinkSync(tempFile);
    } catch {}
  }
}

/**
 * Generate INSERT SQL for an event (without executing)
 */
export function generateInsertSQL(event: LegislativeEvent): string {
  const fingerprint = generateFingerprint(event);
  const normalizedTime = normalizeTime(event.time);
  const id = crypto.randomUUID();

  return `
    INSERT OR REPLACE INTO events (
      id, level, type, state_code, name, date, time, 
      location_name, location_address, lat, lng,
      description, committee_name, details_url, docket_url,
      virtual_meeting_url, source_url, allows_public_participation,
      scraped_at, last_updated, scraper_source, external_id, fingerprint
    ) VALUES (
      ${escapeSQL(id)},
      ${escapeSQL(event.level)},
      ${escapeSQL(event.type)},
      ${escapeSQL(event.state)},
      ${escapeSQL(event.name)},
      ${escapeSQL(event.date)},
      ${escapeSQL(normalizedTime)},
      ${escapeSQL(event.location)},
      ${escapeSQL(event.location)},
      ${event.lat || 0},
      ${event.lng || 0},
      ${escapeSQL(event.description)},
      ${escapeSQL(event.committee)},
      ${escapeSQL(event.detailsUrl)},
      ${escapeSQL(event.docketUrl)},
      ${escapeSQL(event.virtualMeetingUrl)},
      ${escapeSQL(event.sourceUrl)},
      ${event.allowsPublicParticipation ? 1 : 0},
      datetime('now'),
      datetime('now'),
      ${escapeSQL(`${event.state}-scraper`)},
      ${escapeSQL(event.sourceUrl)},
      ${escapeSQL(fingerprint)}
    );
  `;
}

/**
 * Batch insert multiple events at once (MUCH faster than one-by-one)
 */
export function batchInsertEvents(sqlStatements: string[], stateName: string): void {
  const tempFile = `temp-batch-${stateName}-${Date.now()}.sql`;
  try {
    const combinedSQL = sqlStatements.join('\n');
    writeFileSync(tempFile, combinedSQL);
    console.log(`   💾 Executing batch insert of ${sqlStatements.length} events for ${stateName}...`);
    execSync(`wrangler d1 execute civitracker-db --remote --file="${tempFile}"`, {
      stdio: 'pipe'
    });
    console.log(`   ✅ Batch insert completed for ${stateName}`);
  } finally {
    try {
      unlinkSync(tempFile);
    } catch {}
  }
}

/**
 * Insert event into D1 database
 */
export async function insertEvent(event: LegislativeEvent): Promise<string> {
  const fingerprint = generateFingerprint(event);
  const normalizedTime = normalizeTime(event.time);
  const id = crypto.randomUUID();

  const sql = `
    INSERT OR REPLACE INTO events (
      id, level, type, state_code, name, date, time, 
      location_name, location_address, lat, lng,
      description, committee_name, details_url, docket_url,
      virtual_meeting_url, source_url, allows_public_participation,
      scraped_at, last_updated, scraper_source, external_id, fingerprint
    ) VALUES (
      ${escapeSQL(id)},
      ${escapeSQL(event.level)},
      ${escapeSQL(event.type)},
      ${escapeSQL(event.state)},
      ${escapeSQL(event.name)},
      ${escapeSQL(event.date)},
      ${escapeSQL(normalizedTime)},
      ${escapeSQL(event.location)},
      ${escapeSQL(event.location)},
      ${event.lat || 0},
      ${event.lng || 0},
      ${escapeSQL(event.description)},
      ${escapeSQL(event.committee)},
      ${escapeSQL(event.detailsUrl)},
      ${escapeSQL(event.docketUrl)},
      ${escapeSQL(event.virtualMeetingUrl)},
      ${escapeSQL(event.sourceUrl)},
      ${event.allowsPublicParticipation ? 1 : 0},
      datetime('now'),
      datetime('now'),
      ${escapeSQL(`${event.state}-scraper`)},
      ${escapeSQL(event.sourceUrl)},
      ${escapeSQL(fingerprint)}
    );
  `;

  executeD1Command(sql);
  return id;
}

/**
 * Insert bills associated with an event (not implemented for D1 yet)
 */
export async function insertBills(eventId: string, bills: Bill[]): Promise<void> {
  // TODO: Implement D1 bill insertion if needed
  console.log(`⏭️  Skipping ${bills.length} bills (not implemented for D1)`);
}

/**
 * Log scraper health metrics (stored in memory, not persisted)
 */
export async function logScraperHealth(
  state: string,
  success: boolean,
  eventsCount: number,
  error: string | null
): Promise<void> {
  console.log(`📊 Scraper health: ${state} - ${success ? '✅' : '❌'} - ${eventsCount} events`);
  if (error) console.error(`   Error: ${error}`);
}
