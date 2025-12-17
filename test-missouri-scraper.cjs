const fs = require('fs');

/**
 * Test Missouri Scraper
 * Fetches hearings from Missouri House and Senate
 */

async function testScraper() {
  console.log('🏛️  Testing Missouri General Assembly Scraper\n');
  
  try {
    const events = [];
    
    // Fetch House hearings
    console.log('📅 Fetching House hearings...');
    const houseUrl = 'https://house.mo.gov/HearingsTimeOrder.aspx';
    const houseResponse = await fetch(houseUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    if (!houseResponse.ok) {
      throw new Error(`House HTTP ${houseResponse.status}`);
    }
    
    const houseHtml = await houseResponse.text();
    console.log(`✓ Fetched House hearings (${houseHtml.length} bytes)`);
    
    // Look for hearing data in tables
    const committeeMatches = [...houseHtml.matchAll(/<b>Committee:<\/b><\/td><td><a[^>]*>([^<]+)<\/a>/gi)];
    const dateMatches = [...houseHtml.matchAll(/Hearing Date ([^<]+)</gi)];
    const timeMatches = [...houseHtml.matchAll(/<b>Time:<\/b><\/td><td[^>]*>([^<]+)</gi)];
    const locationMatches = [...houseHtml.matchAll(/<b>Location:<\/b><\/td><td[^>]*>([^<]+)</gi)];
    const noteMatches = [...houseHtml.matchAll(/<b>Note:<\/b><\/td><td[^>]*>([^<]+)</gi)];
    
    console.log(`Found ${committeeMatches.length} committees`);
    console.log(`Found ${dateMatches.length} dates`);
    console.log(`Found ${timeMatches.length} times`);
    console.log(`Found ${locationMatches.length} locations`);
    console.log(`Found ${noteMatches.length} notes\n`);
    
    if (committeeMatches.length > 0) {
      // Create event from first match
      const committee = committeeMatches[0][1].trim();
      const dateStr = dateMatches[0] ? dateMatches[0][1].trim() : '';
      const time = timeMatches[0] ? timeMatches[0][1].trim() : 'TBD';
      const location = locationMatches[0] ? locationMatches[0][1].trim() : 'State Capitol';
      const note = noteMatches[0] ? noteMatches[0][1].trim() : '';
      
      console.log('✅ Sample House hearing:');
      console.log(`   Committee: ${committee}`);
      console.log(`   Date: ${dateStr}`);
      console.log(`   Time: ${time}`);
      console.log(`   Location: ${location}`);
      console.log(`   Note: ${note}\n`);
      
      // Parse date
      const date = new Date(dateStr);
      
      events.push({
        id: `mo-${committee.toLowerCase().replace(/\s+/g, '-')}-${date.toISOString().split('T')[0]}`,
        name: committee,
        date: date.toISOString(),
        time,
        location,
        committee,
        type: 'committee-meeting',
        level: 'state',
        state: 'MO',
        city: 'Jefferson City',
        lat: 38.5767,
        lng: -92.1735,
        zipCode: null,
        description: note || 'House committee hearing',
        sourceUrl: houseUrl,
        virtualMeetingUrl: null,
        bills: []
      });
    }
    
    // Check Senate
    console.log('📅 Fetching Senate hearings...');
    const senateUrl = 'https://www.senate.mo.gov/hearingsschedule/hrings.htm';
    const senateResponse = await fetch(senateUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    if (!senateResponse.ok) {
      throw new Error(`Senate HTTP ${senateResponse.status}`);
    }
    
    const senateHtml = await senateResponse.text();
    console.log(`✓ Fetched Senate hearings (${senateHtml.length} bytes)`);
    
    if (senateHtml.toLowerCase().includes('no hearings scheduled')) {
      console.log('⚠️  No Senate hearings scheduled\n');
    }
    
    // Generate static JSON file
    const output = {
      events,
      count: events.length,
      billsCount: events.reduce((sum, e) => sum + (e.bills?.length || 0), 0),
      lastUpdated: new Date().toISOString()
    };
    
    const outputPath = 'public/data/missouri-events.json';
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    
    console.log(`✅ Generated ${outputPath}`);
    console.log(`📊 Events: ${output.count}`);
    console.log(`📋 Bills: ${output.billsCount}`);
    console.log(`🕐 Last updated: ${output.lastUpdated}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testScraper();
