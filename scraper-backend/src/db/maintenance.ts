/**
 * Database Maintenance Operations
 */

import { getPool } from './connection.js';

/**
 * Clean up events older than specified hours
 */
export async function cleanupOldEvents(hoursOld: number = 24): Promise<number> {
  const pool = getPool();
  
  const query = `
    DELETE FROM events 
    WHERE scraped_at < NOW() - INTERVAL '${hoursOld} hours'
  `;

  const result = await pool.query(query);
  const deletedCount = result.rowCount || 0;
  
  if (deletedCount > 0) {
    console.log(`   Removed ${deletedCount} events older than ${hoursOld} hours`);
  }
  
  return deletedCount;
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<any> {
  const pool = getPool();
  
  const stats = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM events) as total_events,
      (SELECT COUNT(*) FROM events WHERE date >= CURRENT_DATE) as upcoming_events,
      (SELECT COUNT(DISTINCT state_code) FROM events) as states_with_events,
      (SELECT COUNT(*) FROM scraper_health WHERE scraped_at > NOW() - INTERVAL '24 hours') as recent_scrapes
  `);

  return stats.rows[0];
}
