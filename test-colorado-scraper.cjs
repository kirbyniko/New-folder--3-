const cheerio = require('cheerio');
const fs = require('fs');
const https = require('https');

/**
 * Test script for Colorado Legislature scraper
 * Generates static JSON file from Colorado schedule page
 */

const SCHEDULE_URL = 'https://leg.colorado.gov/schedule';
const CACHE_FILE = 'temp-co-schedule.html';
const OUTPUT_FILE = 'public/data/colorado-events.json';

// Denver State Capitol coordinates
const LATITUDE = 39.7392;
const LONGITUDE = -104.9903;

/**
 * Fetch page with error handling
 */
function fetchPage(url) {
  return new Promise((resolve, reject) => {
    console.log(`Fetching ${url}...`);
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`Fetched ${data.length} bytes`);
        resolve(data);
      });
    }).on('error', reject);
  });
}

/**
 * Parse date from header like "Tue Dec 16, 2025"
 */
function parseDate(dateStr) {
  try {
    const match = dateStr.match(/([A-Za-z]+)\s+([A-Za-z]+)\s+(\d+),\s+(\d{4})/);
    if (!match) {
      console.warn(`Could not parse date: ${dateStr}`);
      return null;
    }

    const [, , month, day, year] = match;
    const date = new Date(`${month} ${day}, ${year}`);
    
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date parsed: ${dateStr}`);
      return null;
    }

    return date;
  } catch (error) {
    console.error(`Error parsing date "${dateStr}":`, error);
    return null;
  }
}

/**
 * Combine date and time into a single Date object
 */
function combineDateAndTime(date, timeStr) {
  try {
    // Handle "Upon Adjournment" - set to noon as placeholder
    if (timeStr.toLowerCase().includes('upon adjournment')) {
      const combined = new Date(date);
      combined.setHours(12, 0, 0, 0);
      return combined;
    }

    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) {
      console.warn(`Could not parse time: ${timeStr}`);
      return null;
    }

    let [, hours, minutes, ampm] = match;
    let hour = parseInt(hours, 10);
    const minute = parseInt(minutes, 10);

    if (ampm.toUpperCase() === 'PM' && hour !== 12) {
      hour += 12;
    } else if (ampm.toUpperCase() === 'AM' && hour === 12) {
      hour = 0;
    }

    const combined = new Date(date);
    combined.setHours(hour, minute, 0, 0);

    return combined;
  } catch (error) {
    console.error(`Error combining date and time:`, error);
    return null;
  }
}

/**
 * Format date as 12-hour time string
 */
function formatTime(date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');
  
  return `${displayHours}:${displayMinutes} ${ampm}`;
}

/**
 * Fetch agenda page and extract title and hearing items
 */
async function fetchAgendaDetails(agendaUrl) {
  try {
    console.log(`  Fetching agenda: ${agendaUrl}`);
    const html = await fetchPage(agendaUrl);
    if (!html) return null;

    const $ = cheerio.load(html);
    
    // Extract title from h1
    const title = $('.agenda-heading').text().trim();
    
    // Extract hearing items
    const hearingItems = [];
    $('tr').each((_, row) => {
      const $row = $(row);
      const headerCell = $row.find('th[scope="row"]');
      
      if (headerCell.text().trim() === 'Hearing Item') {
        const item = $row.find('td span').text().trim();
        if (item) {
          hearingItems.push(item);
        }
      }
    });

    return { title, hearingItems };
  } catch (error) {
    console.error(`  Failed to fetch agenda:`, error.message);
    return null;
  }
}

/**
 * Parse schedule HTML and extract events
 */
async function parseSchedule(html) {
  const $ = cheerio.load(html);
  const events = [];
  const now = new Date();

  console.log('Parsing schedule sections...');

  $('.interim-schedule-table').each((_, section) => {
    const dateHeader = $(section).find('h3.text-center').text().trim();
    console.log(`Found date section: ${dateHeader}`);
    
    const eventDate = parseDate(dateHeader);

    if (!eventDate) {
      console.warn(`Skipping section with invalid date: ${dateHeader}`);
      return;
    }

    if (eventDate < now) {
      console.log(`Skipping past date: ${dateHeader}`);
      return;
    }

    let sectionCount = 0;
    $(section).find('tbody tr').each((_, row) => {
      const $row = $(row);

      const timeText = $row.find('td[data-label="Time"] span').text().trim();
      
      const activityCell = $row.find('td[data-label="Activity"]');
      const committeeName = activityCell.find('a').text().trim();
      const committeeUrl = activityCell.find('a').attr('href');

      const location = $row.find('td[data-label="Location"] span').text().trim();

      const agendaCell = $row.find('td[data-label="Agenda"]');
      const agendaLink = agendaCell.find('a.link-primary').attr('href');

      const audioCell = $row.find('td[data-label="Audio"]');
      const audioLink = audioCell.find('a').attr('href');

      if (!committeeName || !timeText) {
        return;
      }

      const dateTime = combineDateAndTime(eventDate, timeText);
      
      if (!dateTime) {
        return;
      }

      // Generate unique ID from date, time, and committee
      const eventId = `co-${dateTime.getTime()}-${committeeName.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30)}`;
      
      const event = {
        id: eventId,
        state: 'CO',
        date: dateTime.toISOString(),
        time: formatTime(dateTime),
        committee: committeeName,
        location: `${location}, Colorado State Capitol, Denver`,
        level: 'state',
        lat: LATITUDE,
        lng: LONGITUDE,
        bills: [],
      };

      if (agendaLink) {
        event.agendaUrl = agendaLink.startsWith('http') 
          ? agendaLink 
          : `https://leg.colorado.gov${agendaLink}`;
      }

      if (audioLink) {
        event.livestreamUrl = audioLink;
      }

      if (committeeUrl) {
        event.url = committeeUrl.startsWith('http')
          ? committeeUrl
          : `https://leg.colorado.gov${committeeUrl}`;
      }

      events.push(event);
      sectionCount++;
    });

    console.log(`  Extracted ${sectionCount} events from ${dateHeader}`);
  });

  console.log(`\nEnriching ${events.length} events with agenda details...`);
  
  // Enrich events with agenda details
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (event.agendaUrl) {
      console.log(`[${i + 1}/${events.length}] ${event.committee}`);
      const details = await fetchAgendaDetails(event.agendaUrl);
      
      if (details) {
        event.name = details.title || event.committee;
        if (details.hearingItems.length > 0) {
          event.description = `Hearing Items:\n${details.hearingItems.map((item, idx) => `${idx + 1}. ${item}`).join('\n')}`;
        }
      } else {
        event.name = event.committee;
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    } else {
      event.name = event.committee;
    }
  }

  return events;
}

/**
 * Main function
 */
async function main() {
  try {
    let html;

    // Try to read from cache first
    if (fs.existsSync(CACHE_FILE)) {
      console.log(`Reading cached HTML from ${CACHE_FILE}...`);
      html = fs.readFileSync(CACHE_FILE, 'utf8');
      console.log(`Read ${html.length} bytes from cache`);
    } else {
      console.log('Cache not found, fetching from web...');
      html = await fetchPage(SCHEDULE_URL);
      
      // Save to cache
      fs.writeFileSync(CACHE_FILE, html);
      console.log(`Saved ${html.length} bytes to ${CACHE_FILE}`);
    }

    const events = await parseSchedule(html);

    console.log(`\nTotal events found: ${events.length}`);

    if (events.length > 0) {
      console.log('\nSample events:');
      events.slice(0, 3).forEach(event => {
        console.log(`  - ${event.committee} on ${event.date}`);
        console.log(`    Location: ${event.location}`);
        if (event.agendaUrl) console.log(`    Agenda: ${event.agendaUrl}`);
        if (event.livestreamUrl) console.log(`    Livestream: ${event.livestreamUrl}`);
      });

      // Count total bills
      const totalBills = events.reduce((sum, event) => sum + (event.bills?.length || 0), 0);

      // Create wrapper structure matching other static files
      const output = {
        count: events.length,
        billsCount: totalBills,
        lastUpdated: new Date().toISOString(),
        events: events
      };

      // Ensure output directory exists
      const outputDir = OUTPUT_FILE.substring(0, OUTPUT_FILE.lastIndexOf('/'));
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Write to JSON file
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
      console.log(`\n✓ Saved ${events.length} events (${totalBills} bills) to ${OUTPUT_FILE}`);
    } else {
      console.log('\n⚠ No future events found');
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
