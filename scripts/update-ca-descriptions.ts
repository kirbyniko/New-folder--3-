import { CaliforniaScraper } from '../netlify/functions/utils/scrapers/states/california';
import { getPool } from '../netlify/functions/utils/db/connection';

async function updateCABillDescriptions() {
  console.log('🔄 Updating California bill descriptions...\n');
  
  const scraper = new CaliforniaScraper();
  const pool = getPool();
  
  try {
    // Scrape events
    const events = await scraper.scrapeCalendar();
    console.log(`✅ Scraped ${events.length} events\n`);
    
    // Collect all bills with descriptions
    const billsMap = new Map<string, string>();
    
    for (const event of events) {
      if (event.bills) {
        for (const bill of event.bills) {
          if (bill.description && !billsMap.has(bill.id)) {
            billsMap.set(bill.id, bill.description);
          }
        }
      }
    }
    
    console.log(`📊 Found ${billsMap.size} unique bills with descriptions\n`);
    
    // Update bills in database
    console.log('💾 Updating bill descriptions...');
    let updated = 0;
    let failed = 0;
    
    for (const [billNumber, description] of billsMap.entries()) {
      try {
        const result = await pool.query(`
          UPDATE bills 
          SET description = $1,
              content_hash = NULL,  -- Reset hash so summary gets regenerated
              last_summarized_at = NULL
          WHERE state_code = 'CA' 
          AND bill_number = $2
          AND (description IS NULL OR description != $1)  -- Only update if changed
        `, [description, billNumber]);
        
        if (result.rowCount && result.rowCount > 0) {
          updated++;
          console.log(`   ✅ ${billNumber}: ${description.substring(0, 60)}...`);
        }
        
      } catch (error: any) {
        failed++;
        console.error(`   ❌ ${billNumber}: ${error.message}`);
      }
    }
    
    console.log(`\n📊 Results:`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Unchanged: ${billsMap.size - updated - failed}`);
    
    // Verify
    console.log('\n🔍 Verifying database...');
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(description) as with_desc,
        COUNT(summary) as with_summary
      FROM bills 
      WHERE state_code = 'CA'
    `);
    
    const row = stats.rows[0];
    console.log(`   Total CA bills: ${row.total}`);
    console.log(`   With description: ${row.with_desc} (${Math.round(row.with_desc/row.total*100)}%)`);
    console.log(`   With summary: ${row.with_summary} (${Math.round(row.with_summary/row.total*100)}%)`);
    
    console.log('\n✅ Update complete! Bills now have descriptions for LLM summarization.');
    console.log('💡 Next step: Run summarization script to generate summaries with improved prompt.');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

updateCABillDescriptions();
