const fs = require('fs');

/**
 * Test Wisconsin Scraper
 * Fetches committee meetings from Wisconsin Legislature
 */

async function testScraper() {
  console.log('🏛️  Testing Wisconsin Legislature Scraper\n');
  
  try {
    const events = [];
    
    // Read from cached file for testing
    console.log('📅 Reading Wisconsin committee schedule from cache...');
    let html;
    try {
      html = fs.readFileSync('temp-wi-schedule.html', 'utf-8');
      console.log(`✓ Read cached schedule page (${html.length} bytes)`);
    } catch (err) {
      console.log('Cache not found, fetching from web...');
      const url = 'https://committeeschedule.legis.wisconsin.gov/';
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      html = await response.text();
      console.log(`✓ Fetched schedule page (${html.length} bytes)`);
      fs.writeFileSync('temp-wi-schedule.html', html);
    }
    
    // Parse event objects from JavaScript
    const eventPattern = /\{\s*title:\s*'([^']+)',\s*start:\s*'([^']+)',\s*description:\s*'([^']+)',\s*classNames:\s*'([^']+)',\s*url:\s*'([^']+)',\s*extendedProps:\s*\{[^}]*type:\s*'([^']*)',\s*eItems:\s*'([^']*)',\s*topics:\s*'([^']*)',\s*mtgNoticeLink:\s*'([^']+)',\s*commLink:\s*'([^']+)',\s*location:\s*'([^']+)',\s*committeeID:\s*'([^']+)'/g;
    
    let match;
    let count = 0;
    const now = new Date();
    
    while ((match = eventPattern.exec(html)) !== null) {
      const [, title, start, description, classNames, url, type, eItems, topics, mtgNoticeLink, commLink, location, committeeID] = match;
      
      // Parse date
      const dateObj = new Date(start);
      
      // Only include future events
      if (dateObj < now) continue;
      
      // Format time
      const hours = dateObj.getHours();
      const minutes = dateObj.getMinutes();
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      const displayMinutes = minutes.toString().padStart(2, '0');
      const time = `${displayHours}:${displayMinutes} ${period}`;
      
      // Clean location
      const cleanLocation = location
        .replace(/&#xA;/g, ', ')
        .replace(/&amp;/g, '&')
        .trim();
      
      // Parse bills
      const bills = [];
      if (eItems && eItems !== '(None)' && eItems.trim() !== '') {
        const items = eItems.split(';').map(s => s.trim());
        for (const item of items) {
          const billMatch = item.match(/^([AS]B)(\d+)$/i);
          if (billMatch) {
            const billType = billMatch[1].toUpperCase();
            const billNum = billMatch[2];
            const billId = `${billType}${billNum}`;
            bills.push({
              id: billId,
              title: `${title} - ${billId}`,
              url: `https://docs.legis.wisconsin.gov/2025/proposals/${billId.toLowerCase()}`
            });
          }
        }
      }
      
      count++;
      if (count === 1) {
        console.log('\n✅ Sample event:');
        console.log(`   Committee: ${title}`);
        console.log(`   Date: ${dateObj.toLocaleDateString()}`);
        console.log(`   Time: ${time}`);
        console.log(`   Location: ${cleanLocation}`);
        console.log(`   Type: ${type} - ${description}`);
        console.log(`   Bills: ${bills.length > 0 ? bills.map(b => b.id).join(', ') : 'None'}`);
        console.log(`   Topics: ${topics.substring(0, 100)}...`);
      }
      
      events.push({
        id: `wi-${committeeID}-${dateObj.toISOString().split('T')[0]}`,
        name: title,
        date: dateObj.toISOString(),
        time,
        location: cleanLocation || 'State Capitol',
        committee: title,
        type: `${type || 'Meeting'} - ${description}`,
        level: 'state',
        state: 'WI',
        city: 'Madison',
        lat: 43.0747,
        lng: -89.3841,
        zipCode: null,
        description: `${classNames.trim() || 'Joint'} committee ${description.toLowerCase()}. Topics: ${topics || 'Not specified'}`,
        sourceUrl: mtgNoticeLink || url,
        virtualMeetingUrl: null,
        bills: bills.length > 0 ? bills : []
      });
    }
    
    console.log(`\nFound ${count} future events\n`);
    
    // Generate static JSON file
    const output = {
      events,
      count: events.length,
      billsCount: events.reduce((sum, e) => sum + (e.bills?.length || 0), 0),
      lastUpdated: new Date().toISOString()
    };
    
    const outputPath = 'public/data/wisconsin-events.json';
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
