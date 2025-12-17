"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBrowser = getBrowser;
exports.createPage = createPage;
exports.scrapeWithPuppeteer = scrapeWithPuppeteer;
exports.closeBrowser = closeBrowser;
exports.scrapeCalendarEvents = scrapeCalendarEvents;
const puppeteer_1 = __importDefault(require("puppeteer"));
const chromium_1 = __importDefault(require("@sparticuz/chromium"));
/**
 * Puppeteer Helper for Headless Browser Scraping
 *
 * Used for sites that require JavaScript execution:
 * - Client-side rendered calendars (React/Next.js)
 * - Sites with JavaScript challenges (Akamai, Cloudflare)
 * - Dynamic content loading
 */
let browserInstance = null;
/**
 * Get or create a browser instance
 * Reuses existing browser to improve performance
 */
async function getBrowser() {
    if (browserInstance && browserInstance.connected) {
        return browserInstance;
    }
    // Check if running in Netlify/serverless environment
    const isProduction = !!process.env.AWS_LAMBDA_FUNCTION_VERSION;
    if (isProduction) {
        // Use @sparticuz/chromium for AWS Lambda
        browserInstance = await puppeteer_1.default.launch({
            args: chromium_1.default.args,
            defaultViewport: chromium_1.default.defaultViewport,
            executablePath: await chromium_1.default.executablePath(),
            headless: chromium_1.default.headless,
        });
    }
    else {
        // Local development - use system Chrome
        browserInstance = await puppeteer_1.default.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
            ],
        });
    }
    return browserInstance;
}
/**
 * Create a new page with common settings
 */
async function createPage() {
    const browser = await getBrowser();
    const page = await browser.newPage();
    // Set realistic browser headers
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({
        width: 1920,
        height: 1080,
    });
    // Set timeout for navigation
    page.setDefaultTimeout(30000); // 30 seconds
    return page;
}
/**
 * Scrape a page with JavaScript rendering
 *
 * @param url - URL to scrape
 * @param waitFor - CSS selector or time (ms) to wait for content
 * @param evaluate - Optional function to run in page context
 * @returns HTML content or evaluated result
 */
async function scrapeWithPuppeteer(url, options = {}) {
    const page = await createPage();
    try {
        console.log(`[Puppeteer] Navigating to: ${url}`);
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000,
        });
        // Wait for specific selector or time
        if (options.waitFor) {
            if (typeof options.waitFor === 'string') {
                console.log(`[Puppeteer] Waiting for selector: ${options.waitFor}`);
                await page.waitForSelector(options.waitFor, { timeout: 30000 });
            }
            else {
                console.log(`[Puppeteer] Waiting ${options.waitFor}ms`);
                await page.waitForTimeout(options.waitFor);
            }
        }
        // Take screenshot if requested (useful for debugging)
        if (options.screenshot) {
            const screenshotPath = `debug-${Date.now()}.png`;
            await page.screenshot({ path: screenshotPath, fullPage: true });
            console.log(`[Puppeteer] Screenshot saved: ${screenshotPath}`);
        }
        // Run custom evaluation function or return HTML
        if (options.evaluate) {
            console.log(`[Puppeteer] Running custom evaluation`);
            return await options.evaluate(page);
        }
        else {
            const html = await page.content();
            return html;
        }
    }
    catch (error) {
        console.error(`[Puppeteer] Error scraping ${url}:`, error);
        throw error;
    }
    finally {
        await page.close();
    }
}
/**
 * Close the browser instance
 * Call this when done with all scraping to free resources
 */
async function closeBrowser() {
    if (browserInstance) {
        await browserInstance.close();
        browserInstance = null;
        console.log('[Puppeteer] Browser closed');
    }
}
/**
 * Extract data from a calendar page using Puppeteer
 * Common pattern for event calendars
 */
async function scrapeCalendarEvents(url, selector, extractor) {
    return await scrapeWithPuppeteer(url, {
        waitFor: selector,
        evaluate: async (page) => {
            // eslint-disable-next-line no-undef
            return await page.evaluate((sel, extractorStr) => {
                const extractor = new Function('element', `return (${extractorStr})(element);`);
                const elements = Array.from(document.querySelectorAll(sel));
                return elements.map(extractor);
            }, selector, extractor.toString());
        },
    });
}
