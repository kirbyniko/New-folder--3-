// Connecticut General Assembly Committee Meetings Scraper
// Uses JSON API endpoints discovered through browser DevTools inspection

import fetch from 'node-fetch';
import https from 'https';

// SSL agent for development (Connecticut has SSL cert issues)
const agent = new https.Agent({
  rejectUnauthorized: false
});

/**
 * Connecticut Committee Codes
 * Reference: https://www.cga.ct.gov/asp/menu/cgacommittees.asp
 */
const COMMITTEE_CODES = {
  'age': 'Aging',
  'app': 'Appropriations',
  'ba': 'Banking',
  'kid': 'Children',
  'ce': 'Commerce',
  'ed': 'Education',
  'et': 'Energy and Technology',
  'env': 'Environment',
  'exn': 'Executive and Legislative Nominations',
  'fin': 'Finance, Revenue and Bonding',
  'gl': 'General Law',
  'gae': 'Government Administration and Elections',
  'gos': 'Government Oversight',
  'hed': 'Higher Education and Employment',
  'hsg': 'Housing',
  'hs': 'Human Services',
  'ins': 'Insurance and Real Estate',
  'jud': 'Judiciary',
  'lab': 'Labor and Public Employees',
  'pd': 'Planning and Development',
  'ph': 'Public Health',
  'ps': 'Public Safety and Security',
  'rr': 'Regulation Review',
  'tra': 'Transportation',
  'va': 'Veterans\' and Military Affairs'
};

/**
 * Fetch all committee meetings from Connecticut General Assembly
 * 
 * API Details:
 * - Main calendar API: https://www.cga.ct.gov/in-calevents.php
 * - Committee calendar API: https://www.cga.ct.gov/basin/fullcalendar/commevents.php
 * - Parameters: start (unix timestamp), end (unix timestamp), comm_code (optional)
 * - Returns: Array of event objects with meeting details
 * 
 * @param {Object} options - Scraping options
 * @param {Date} options.startDate - Start date for meeting range
 * @param {Date} options.endDate - End date for meeting range
 * @param {string[]} options.committees - Array of committee codes to fetch (optional, defaults to all)
 * @returns {Promise<Array>} Array of meeting objects
 */
export async function scrapeConnecticutMeetings(options = {}) {
  const {
    startDate = new Date(),
    endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // Default: next 90 days
    committees = Object.keys(COMMITTEE_CODES)
  } = options;

  const startTimestamp = Math.floor(startDate.getTime() / 1000);
  const endTimestamp = Math.floor(endDate.getTime() / 1000);

  console.log(`Fetching Connecticut meetings from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);
  console.log(`Committees: ${committees.length === Object.keys(COMMITTEE_CODES).length ? 'all' : committees.join(', ')}`);

  // Fetch from main calendar API (gets all events)
  const mainUrl = `https://www.cga.ct.gov/in-calevents.php?start=${startTimestamp}&end=${endTimestamp}`;
  
  try {
    console.log('\nFetching from main calendar API...');
    const response = await fetch(mainUrl, { agent });
    const allEvents = await response.json();
    
    console.log(`✓ Retrieved ${allEvents.length} total events`);
    
    // Filter for committee meetings
    const committeeMeetings = allEvents.filter(event => {
      // Filter by committee code if specified
      const commCode = event.office_code?.trim().toLowerCase();
      if (committees.length < Object.keys(COMMITTEE_CODES).length) {
        return committees.includes(commCode);
      }
      return true;
    });

    console.log(`✓ Found ${committeeMeetings.length} committee meetings`);

    // Transform to standard format
    const meetings = committeeMeetings.map(event => ({
      id: event.id?.toString(),
      committee: COMMITTEE_CODES[event.office_code?.trim().toLowerCase()] || event.office_code?.trim(),
      committeeCode: event.office_code?.trim().toLowerCase(),
      title: event.title,
      date: event.start,
      startTime: event.start,
      endTime: event.end,
      location: event.location,
      building: event.building,
      room: event.actualroom?.trim(),
      meetingType: getMeetingType(event.mtg_type),
      isHybrid: event.hybrid?.trim() === 'HYB',
      agendaUrl: event.url ? `https://www.cga.ct.gov${event.url}` : null,
      contact: event.contact,
      source: 'Connecticut General Assembly',
      sourceUrl: 'https://www.cga.ct.gov/calendarofevents.asp',
      scrapedAt: new Date().toISOString()
    }));

    return meetings;

  } catch (error) {
    console.error('Error fetching Connecticut meetings:', error);
    throw error;
  }
}

/**
 * Get meeting type description
 */
function getMeetingType(code) {
  const types = {
    'COM': 'Committee Meeting',
    'PH': 'Public Hearing',
    'OTH': 'Other Event',
    'JF': 'Joint Favorable',
    'WRK': 'Work Session'
  };
  return types[code] || code;
}

/**
 * Fetch meetings for a specific committee
 * 
 * @param {string} committeeCode - Committee code (e.g., 'ph', 'ed')
 * @param {Object} options - Options
 * @returns {Promise<Array>} Array of meeting objects
 */
export async function scrapeCommitteeMeetings(committeeCode, options = {}) {
  const {
    startDate = new Date(),
    endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
  } = options;

  const startTimestamp = Math.floor(startDate.getTime() / 1000);
  const endTimestamp = Math.floor(endDate.getTime() / 1000);

  const url = `https://www.cga.ct.gov/basin/fullcalendar/commevents.php?comm_code=${committeeCode}&start=${startTimestamp}&end=${endTimestamp}`;

  try {
    console.log(`Fetching meetings for committee: ${committeeCode}`);
    const response = await fetch(url, { agent });
    const text = await response.text();
    
    // Handle empty responses
    if (!text || text.trim() === '') {
      console.log(`No meetings found for committee: ${committeeCode}`);
      return [];
    }
    
    const events = JSON.parse(text);
    console.log(`✓ Found ${events.length} meetings`);

    return events.map(event => ({
      id: event.id?.toString(),
      committee: COMMITTEE_CODES[committeeCode] || committeeCode,
      committeeCode: committeeCode,
      title: event.title,
      date: event.start,
      startTime: event.start,
      endTime: event.end,
      location: event.location,
      building: event.building,
      room: event.actualroom?.trim(),
      meetingType: getMeetingType(event.mtg_type),
      isHybrid: event.hybrid?.trim() === 'HYB',
      agendaUrl: event.url ? `https://www.cga.ct.gov${event.url}` : null,
      contact: event.contact,
      source: 'Connecticut General Assembly',
      sourceUrl: `https://www.cga.ct.gov/asp/menu/CGACommCal.asp?comm_code=${committeeCode}`,
      scrapedAt: new Date().toISOString()
    }));

  } catch (error) {
    console.error(`Error fetching meetings for committee ${committeeCode}:`, error);
    return [];
  }
}

// Export committee codes for reference
export { COMMITTEE_CODES };

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const startDate = new Date();
  const endDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // Next 60 days

  console.log('=== Connecticut General Assembly Committee Meetings Scraper ===\n');

  scrapeConnecticutMeetings({ startDate, endDate })
    .then(meetings => {
      console.log(`\n=== Results ===`);
      console.log(`Total meetings: ${meetings.length}`);
      
      // Group by committee
      const byCommittee = {};
      meetings.forEach(m => {
        if (!byCommittee[m.committee]) byCommittee[m.committee] = [];
        byCommittee[m.committee].push(m);
      });
      
      console.log(`\nMeetings by committee:`);
      Object.entries(byCommittee)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([committee, mtgs]) => {
          console.log(`  ${committee}: ${mtgs.length}`);
        });

      console.log('\n=== Sample Meeting ===');
      if (meetings.length > 0) {
        console.log(JSON.stringify(meetings[0], null, 2));
      }
    })
    .catch(error => {
      console.error('Scraping failed:', error);
      process.exit(1);
    });
}
