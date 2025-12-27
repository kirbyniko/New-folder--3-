/**
 * Database Maintenance Operations (D1)
 */

import { execSync } from 'child_process';

/**
 * Clean up events older than specified hours
 */
export async function cleanupOldEvents(hoursOld: number = 24): Promise<number> {
  console.log(`🧹 Cleaning up events older than ${hoursOld} hours...`);
  
  const sql = `
    DELETE FROM events 
    WHERE scraped_at < datetime('now', '-${hoursOld} hours');
  `;

  try {
    const result = execSync(
      `wrangler d1 execute civitracker-db --remote --command="${sql.replace(/"/g, '\\"')}"`,
      { encoding: 'utf-8' }
    );
    console.log('   ✅ Cleanup complete');
    return 0; // D1 doesn't return row count easily
  } catch (error) {
    console.error('   ❌ Cleanup failed:', error);
    return 0;
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<any> {
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM events) as total_events,
      (SELECT COUNT(*) FROM events WHERE date >= date('now')) as upcoming_events,
      (SELECT COUNT(DISTINCT state_code) FROM events) as states_with_events;
  `;

  try {
    const result = execSync(
      `wrangler d1 execute civitracker-db --remote --command="${sql.replace(/"/g, '\\"')}"`,
      { encoding: 'utf-8' }
    );
    console.log('📊 Database stats:', result);
    return {}; // Parse output if needed
  } catch (error) {
    console.error('❌ Stats query failed');
    return {};
  }
}
