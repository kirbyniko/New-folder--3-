import { scrapeLasVegasMeetings } from './netlify/functions/utils/scrapers/local/las-vegas.js';

async function testIds() {
  const events = await scrapeLasVegasMeetings();
  console.log('\n✅ Las Vegas Events with IDs:');
  events.forEach((e, i) => {
    console.log(`${i + 1}. ID: ${e.id}`);
    console.log(`   Name: ${e.name}`);
  });
}

testIds();
