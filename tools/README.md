/**
 * STATE MAPPING BUILDERS - FRAMEWORK
 * 
 * PHILOSOPHY:
 * - Most state legislature data is semi-static (committees, districts, etc.)
 * - Scraping this data at runtime is wasteful and slow
 * - Better approach: Build mappings ONCE, hardcode them, update manually when needed
 * 
 * PATTERN:
 * 1. Create a builder tool for each state (tools/build-[state]-mappings.js)
 * 2. Run it MANUALLY when needed (not part of main scraper)
 * 3. Copy the output into the state scraper file
 * 4. Commit the hardcoded mappings
 * 
 * WHEN TO RUN BUILDERS:
 * - Initial setup for a new state
 * - Annual maintenance check
 * - When scraper logs show "mapping not found" errors
 * - After state legislature system updates
 * 
 * BENEFITS:
 * - Fast runtime scraping (no extra network calls)
 * - No headless browser overhead in production
 * - Predictable, reliable scraping
 * - Easy to version control and audit
 * - Clear separation: data collection vs data usage
 * 
 * BUILDERS AVAILABLE:
 * - tools/build-nh-committee-mappings.js - New Hampshire committees
 * - (Add more as you expand to other states)
 */

// Re-export builders for convenience
export { buildNHCommitteeMappings } from './build-nh-committee-mappings.js';

/**
 * TEMPLATE FOR NEW STATE BUILDERS:
 * 
 * 1. Create tools/build-[STATE]-mappings.js
 * 2. Use puppeteer if JavaScript is required
 * 3. Use fetch/cheerio if static HTML works
 * 4. Output TypeScript-ready object literal
 * 5. Include last-updated date in output
 * 6. Document when to re-run
 * 
 * Example structure:
 * 
 * ```javascript
 * import puppeteer from 'puppeteer';
 * 
 * async function buildStateMappings() {
 *   const browser = await puppeteer.launch({ headless: true });
 *   const page = await browser.newPage();
 *   
 *   // Navigate and scrape
 *   await page.goto('https://state.legislature.gov/...');
 *   
 *   const data = await page.evaluate(() => {
 *     // Extract data from DOM
 *     return { ... };
 *   });
 *   
 *   // Output TypeScript-ready format
 *   console.log('const mappings = {');
 *   Object.entries(data).forEach(([key, value]) => {
 *     console.log(`  '${key}': '${value}',`);
 *   });
 *   console.log('};');
 *   
 *   await browser.close();
 * }
 * 
 * buildStateMappings();
 * ```
 */

console.log(`
╔════════════════════════════════════════════════════════════════════╗
║                    STATE MAPPING BUILDERS                          ║
║                                                                    ║
║  These tools help you build hardcoded mappings for state data.    ║
║  Run them MANUALLY when needed, not as part of runtime scraping.  ║
╚════════════════════════════════════════════════════════════════════╝

Available builders:

  📍 New Hampshire Committees
     npm run build-mappings:nh
     or: node tools/build-nh-committee-mappings.js

  📍 (Add more states as needed)

Usage pattern:
  1. Run builder tool
  2. Copy output
  3. Paste into state scraper
  4. Commit and deploy
  5. Re-run only when data becomes stale

Why this approach?
  ✅ Fast runtime performance
  ✅ No headless browser in production
  ✅ Reliable and predictable
  ✅ Easy to audit and version control
  ❌ Requires manual updates (but rare - yearly at most)
`);
