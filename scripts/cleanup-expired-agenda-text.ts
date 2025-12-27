/**
 * Cleanup Expired Agenda Text
 * 
 * Clears the agenda_text field from agenda_summaries table for events that have passed.
 * This saves space while keeping the AI-generated summaries.
 * 
 * Usage:
 * npx tsx scripts/cleanup-expired-agenda-text.ts
 */

import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';

console.log('🧹 Cleaning up agenda text for expired events...');

const query = `
UPDATE agenda_summaries
SET agenda_text = NULL
WHERE event_id IN (
  SELECT id FROM events 
  WHERE date < date('now')
)
AND agenda_text IS NOT NULL;
`;

const tempFile = 'temp-cleanup.sql';
writeFileSync(tempFile, query, 'utf-8');

try {
  execSync(
    `wrangler d1 execute civitracker-db --remote --file ${tempFile}`,
    { encoding: 'utf-8', stdio: 'pipe' }
  );
  
  console.log('✅ Cleanup complete');
  console.log('   Cleared agenda_text for all past events');
  console.log('   (Summaries preserved)');
} catch (error: any) {
  console.error('❌ Cleanup failed:', error.message);
  process.exit(1);
} finally {
  unlinkSync(tempFile);
}
