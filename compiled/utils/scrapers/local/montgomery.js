"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeMontgomeryMeetings = scrapeMontgomeryMeetings;
exports.scrapeCalendar = scrapeCalendar;
const puppeteer_helper_1 = require("../puppeteer-helper");
/**
 * Montgomery, Alabama City Council Scraper
 *
 * Scrapes meetings from Montgomery's calendar using Puppeteer
 * URL: https://www.montgomeryal.gov/work/advanced-components/list-detail-pages/calendar-meeting-list
 *
 * The site is protected by Akamai edge security that blocks basic HTTP requests.
 * Puppeteer with a real browser instance can bypass these protections by:
 * - Executing JavaScript challenges
 * - Maintaining session cookies
 * - Appearing as a real browser
 */
const CALENDAR_URL = 'https://www.montgomeryal.gov/work/advanced-components/list-detail-pages/calendar-meeting-list';
/**
 * Scrape Montgomery City Council meetings using Puppeteer
 * Bypasses Akamai security by using real browser with JavaScript execution
 */
async function scrapeMontgomeryMeetings() {
    try {
        console.log(`[Montgomery] Fetching calendar with Puppeteer from ${CALENDAR_URL}`);
        console.log(`[Montgomery] Note: Using headless browser to bypass Akamai security`);
        const events = await (0, puppeteer_helper_1.scrapeWithPuppeteer)(CALENDAR_URL, {
            // Wait for calendar content to load
            waitFor: 5000, // Give extra time for Akamai checks and page load
            evaluate: async (page) => {
                // Check if we got an Akamai error page
                const bodyText = await page.evaluate(() => document.body.innerText);
                if (bodyText.includes('Access Denied') || bodyText.includes('edgesuite.net')) {
                    console.error('[Montgomery] Still blocked by Akamai even with Puppeteer');
                    return [];
                }
                // Wait a bit more for dynamic content
                await page.waitForTimeout(2000);
                // Extract calendar events
                return await page.evaluate(() => {
                    const events = [];
                    // Look for common calendar event selectors
                    // Montgomery might use a list-detail component, so check for:
                    // - Event titles/headers
                    // - Date/time information
                    // - Links to meeting details
                    const eventContainers = document.querySelectorAll('[class*="event"], [class*="meeting"], [class*="calendar-item"], .list-item, article');
                    eventContainers.forEach((container, index) => {
                        // Extract title
                        const titleEl = container.querySelector('h1, h2, h3, h4, [class*="title"], a');
                        const title = titleEl?.textContent?.trim() || '';
                        // Extract date
                        const dateEl = container.querySelector('[class*="date"], time, [datetime]');
                        const date = dateEl?.textContent?.trim() || dateEl?.getAttribute('datetime') || '';
                        // Extract time
                        const timeEl = container.querySelector('[class*="time"]');
                        const time = timeEl?.textContent?.trim() || 'Time TBD';
                        // Extract location
                        const locationEl = container.querySelector('[class*="location"], [class*="venue"]');
                        const location = locationEl?.textContent?.trim() || 'Montgomery City Hall';
                        // Extract URL
                        const linkEl = container.querySelector('a[href]');
                        const url = linkEl?.href || '';
                        // Filter for City Council or government meetings
                        const isCouncilMeeting = title.toLowerCase().includes('city council') ||
                            title.toLowerCase().includes('council meeting') ||
                            title.toLowerCase().includes('commission') ||
                            title.toLowerCase().includes('board') ||
                            title.toLowerCase().includes('committee');
                        if (isCouncilMeeting && title && date) {
                            events.push({
                                id: `montgomery-${index + 1}`,
                                title,
                                date,
                                time,
                                location,
                                url,
                            });
                        }
                    });
                    return events;
                });
            },
        });
        console.log(`[Montgomery] Found ${events.length} potential events via Puppeteer`);
        const rawEvents = [];
        for (const event of events) {
            // Parse date
            let dateStr;
            try {
                const parsedDate = new Date(event.date);
                if (!isNaN(parsedDate.getTime())) {
                    dateStr = parsedDate.toISOString().split('T')[0];
                }
                else {
                    console.warn(`[Montgomery] Could not parse date: ${event.date}`);
                    continue;
                }
            }
            catch (e) {
                console.warn(`[Montgomery] Invalid date format: ${event.date}`);
                continue;
            }
            rawEvents.push({
                id: event.id,
                name: event.title,
                date: dateStr,
                time: event.time,
                location: event.location,
                committee: 'City Council',
                type: 'city-council',
                level: 'local',
                state: 'AL',
                city: 'Montgomery',
                lat: 32.3792,
                lng: -86.3077,
                description: '',
                sourceUrl: event.url || CALENDAR_URL,
            });
        }
        console.log(`[Montgomery] Extracted ${rawEvents.length} City Council meetings`);
        return rawEvents;
    }
    catch (error) {
        console.error('[Montgomery] Puppeteer scraping failed:', error);
        // If Puppeteer fails, log detailed error
        if (error instanceof Error) {
            console.error(`[Montgomery] Error details: ${error.message}`);
            console.error(`[Montgomery] Stack: ${error.stack}`);
        }
        return [];
    }
}
/**
 * Main scraper function
 */
async function scrapeCalendar() {
    return scrapeMontgomeryMeetings();
}
