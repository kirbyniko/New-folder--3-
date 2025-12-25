import crypto from 'crypto';

// Map old event IDs to new event IDs based on name and date matching
const OLD_TO_NEW_MAP: Record<string, string> = {};

async function mapOldToNew() {
  console.log('📊 Finding duplicate CA events...');
  
  // Get all old CA events (with bills)
  const oldEventsQuery = `
    SELECT e.id as old_id, e.name, e.date, e.location_name
    FROM events e
    JOIN event_bills eb ON e.id = eb.event_id
    WHERE e.state_code = 'CA'
    AND LENGTH(e.fingerprint) < 100
    GROUP BY e.id
  `;
  
  const { results: oldEvents } = await (globalThis as any).DB.prepare(oldEventsQuery).all();
  
  console.log(`Found ${oldEvents.length} old CA events with bills`);
  
  for (const oldEvent of oldEvents) {
    // Generate the same fingerprint that run-all-scrapers-d1.ts would create
    const fingerprint = crypto.createHash('sha256')
      .update(`${oldEvent.name}|${oldEvent.date}|${oldEvent.location_name || ''}`)
      .digest('hex');
    
    // Find the new event with this fingerprint
    const { results: newEvents } = await (globalThis as any).DB.prepare(`
      SELECT id as new_id
      FROM events
      WHERE fingerprint = ?
      LIMIT 1
    `).bind(fingerprint).all();
    
    if (newEvents && newEvents.length > 0) {
      OLD_TO_NEW_MAP[oldEvent.old_id] = newEvents[0].new_id;
      console.log(`  ✅ ${oldEvent.name}: ${oldEvent.old_id} → ${newEvents[0].new_id}`);
    } else {
      console.log(`  ⚠️  No new event found for ${oldEvent.name} (${oldEvent.old_id})`);
    }
  }
}

async function migrateEventBills() {
  console.log('\n📦 Migrating event_bills...');
  
  for (const [oldId, newId] of Object.entries(OLD_TO_NEW_MAP)) {
    try {
      // Update event_bills to point to new event ID
      await (globalThis as any).DB.prepare(`
        UPDATE event_bills
        SET event_id = ?
        WHERE event_id = ?
      `).bind(newId, oldId).run();
      
      console.log(`  ✅ Migrated bills from ${oldId} to ${newId}`);
    } catch (error: any) {
      console.error(`  ❌ Failed to migrate ${oldId}:`, error.message);
    }
  }
}

async function deleteOldEvents() {
  console.log('\n🗑️  Deleting old CA events...');
  
  const oldIds = Object.keys(OLD_TO_NEW_MAP);
  
  for (const oldId of oldIds) {
    try {
      await (globalThis as any).DB.prepare(`
        DELETE FROM events WHERE id = ?
      `).bind(oldId).run();
      
      console.log(`  ✅ Deleted ${oldId}`);
    } catch (error: any) {
      console.error(`  ❌ Failed to delete ${oldId}:`, error.message);
    }
  }
}

async function main() {
  console.log('🔧 Fixing CA event duplicates...\n');
  
  // This script is designed to run with wrangler d1 execute
  // with the DB binding available
  
  await mapOldToNew();
  await migrateEventBills();
  await deleteOldEvents();
  
  console.log('\n✅ Migration complete!');
  console.log(`📊 Migrated ${Object.keys(OLD_TO_NEW_MAP).length} events`);
}

// For manual D1 execution, export the SQL commands
export function generateSQL() {
  console.log('-- Step 1: Map old IDs to new IDs');
  console.log('-- Step 2: Update event_bills');
  console.log('-- Step 3: Delete old events');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
