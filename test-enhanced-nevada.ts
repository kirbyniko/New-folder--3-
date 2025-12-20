import { NevadaScraper } from './netlify/functions/utils/scrapers/states/nevada';

async function testEnhancedScraper() {
  const scraper = new NevadaScraper();
  const events = await scraper.scrapeCalendar();
  
  console.log(`\n✅ Found ${events.length} events\n`);
  console.log('='.repeat(80));
  console.log('FIRST 5 EVENTS WITH ENHANCED DETAILS:');
  console.log('='.repeat(80));
  
  events.slice(0, 5).forEach((e, idx) => {
    console.log(`\n${idx + 1}. ${e.name}`);
    console.log(`   Date: ${e.date} (${e.time})`);
    console.log(`   Location: ${e.location}`);
    console.log(`   Description: ${e.description}`);
    console.log(`   Source: ${e.sourceUrl}`);
    console.log(`   Docket: ${e.docketUrl || 'None'}`);
    console.log(`   Virtual: ${e.virtualMeetingUrl || 'None'}`);
    if (e.bills && e.bills.length > 0) {
      console.log(`   📜 Bills: ${e.bills.map(b => b.number).join(', ')}`);
    }
  });
  
  // Check for specific enhancements
  console.log(`\n${'='.repeat(80)}`);
  console.log('ENHANCEMENT STATISTICS:');
  console.log('='.repeat(80));
  
  const withBills = events.filter(e => e.bills && e.bills.length > 0);
  const withAgendaViewer = events.filter(e => e.description?.includes('agenda viewer'));
  const withPublicComment = events.filter(e => e.description?.toLowerCase().includes('public comment'));
  const withBudget = events.filter(e => e.description?.toLowerCase().includes('budget'));
  const withVoting = events.filter(e => e.description?.toLowerCase().includes('voting'));
  
  console.log(`Events with bills: ${withBills.length}`);
  console.log(`Events with agenda viewer: ${withAgendaViewer.length}`);
  console.log(`Events with public comment: ${withPublicComment.length}`);
  console.log(`Events with budget discussion: ${withBudget.length}`);
  console.log(`Events with voting: ${withVoting.length}`);
  
  if (withBills.length > 0) {
    console.log(`\n📜 Sample event with bills:`);
    const sample = withBills[0];
    console.log(`   ${sample.name}`);
    console.log(`   Bills: ${sample.bills!.map(b => b.number).join(', ')}`);
  }
}

testEnhancedScraper().catch(console.error);
