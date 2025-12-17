"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeBirminghamMeetings = scrapeBirminghamMeetings;
exports.scrapeCalendar = scrapeCalendar;
const puppeteer_helper_1 = require("../puppeteer-helper");
/**
 * Birmingham, Alabama City Council Scraper
 *
 * Scrapes meetings from Birmingham's Next.js calendar using Puppeteer
 * URL: https://www.birminghamal.gov/events/calendar
 *
 * The site uses client-side React rendering - events load dynamically via JavaScript.
 * We use Puppeteer to execute JavaScript and extract rendered calendar data.
 */
const BASE_URL = 'https://www.birminghamal.gov';
const CALENDAR_URL = `${BASE_URL}/events/calendar`;
/**
 * Scrape Birmingham City Council meetings using Puppeteer
 * Waits for calendar to render, then extracts City Council meeting events
 */
async function scrapeBirminghamMeetings() {
    try {
        console.log(`[Birmingham] Fetching calendar with Puppeteer from ${CALENDAR_URL}`);
        const events = await (0, puppeteer_helper_1.scrapeWithPuppeteer)(CALENDAR_URL, {
            // Wait for calendar grid to render (skeleton loaders replaced with actual events)
            waitFor: '.grid.grid-cols-7',
            evaluate: async (page) => {
                // Wait a bit more for events to populate after skeleton
                await page.waitForTimeout(3000);
                // Extract events from rendered calendar
                return await page.evaluate(() => {
                    const events = [];
                    // Look for calendar day cells with events
                    const dayCells = document.querySelectorAll('.grid.grid-cols-7 > div');
                    dayCells.forEach((cell) => {
                        // Find event links in this day
                        const eventLinks = cell.querySelectorAll('a[href*="/events/"]');
                        eventLinks.forEach((link) => {
                            const title = link.textContent?.trim() || '';
                            const url = link.href || '';
                            // Try to extract date from parent cell
                            const dateEl = cell.querySelector('[aria-label]');
                            const dateText = dateEl?.getAttribute('aria-label') || '';
                            // Look for time info
                            const timeEl = link.parentElement?.querySelector('[class*="time"], .pl-1');
                            const time = timeEl?.textContent?.trim() || 'Time TBD';
                            // Check if this looks like a City Council meeting
                            const isCouncilMeeting = title.toLowerCase().includes('city council') ||
                                title.toLowerCase().includes('council meeting') ||
                                title.toLowerCase().includes('committee');
                            if (isCouncilMeeting && title && url) {
                                events.push({
                                    id: url.split('/').pop() || `bham-${Date.now()}`,
                                    title,
                                    date: dateText,
                                    time,
                                    location: 'Birmingham City Hall',
                                    categories: [],
                                    departments: ['City Council'],
                                    url,
                                });
                            }
                        });
                    });
                    return events;
                });
            },
        });
        console.log(`[Birmingham] Found ${events.length} potential events via Puppeteer`);
        const rawEvents = [];
        for (const event of events) {
            // Parse date - could be in various formats
            let dateStr;
            try {
                const parsedDate = new Date(event.date);
                if (!isNaN(parsedDate.getTime())) {
                    dateStr = parsedDate.toISOString().split('T')[0];
                }
                else {
                    console.warn(`[Birmingham] Could not parse date: ${event.date}`);
                    continue;
                }
            }
            catch (e) {
                console.warn(`[Birmingham] Invalid date format: ${event.date}`);
                continue;
            }
            rawEvents.push({
                id: `birmingham-${event.id}`,
                name: event.title,
                date: dateStr,
                time: event.time,
                location: event.location || 'Birmingham City Hall',
                committee: 'City Council',
                type: 'city-council',
                level: 'local',
                state: 'AL',
                city: 'Birmingham',
                lat: 33.5186,
                lng: -86.8104,
                description: '',
                sourceUrl: event.url || CALENDAR_URL,
            });
        }
        console.log(`[Birmingham] Extracted ${rawEvents.length} City Council meetings`);
        return rawEvents;
    }
    catch (error) {
        console.error('[Birmingham] Scraping failed:', error);
        return [];
    }
}
/**
 * Main scraper function
 */
async function scrapeCalendar() {
    return scrapeBirminghamMeetings();
}
