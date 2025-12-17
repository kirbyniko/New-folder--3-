import puppeteer, { Browser, Page } from 'puppeteer';
import chromium from '@sparticuz/chromium';

/**
 * Puppeteer Helper for Headless Browser Scraping
 * 
 * Used for sites that require JavaScript execution:
 * - Client-side rendered calendars (React/Next.js)
 * - Sites with JavaScript challenges (Akamai, Cloudflare)
 * - Dynamic content loading
 */

let browserInstance: Browser | null = null;

/**
 * Get or create a browser instance
 * Reuses existing browser to improve performance
 */
export async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }

  // Check if running in Netlify/serverless environment
  const isProduction = !!process.env.AWS_LAMBDA_FUNCTION_VERSION || !!process.env.AWS_EXECUTION_ENV;
  const isNetlifyDev = !!process.env.NETLIFY_DEV;
  
  console.log('[Puppeteer] Environment check:', {
    isProduction,
    isNetlifyDev,
    AWS_LAMBDA: !!process.env.AWS_LAMBDA_FUNCTION_VERSION,
    AWS_EXEC: !!process.env.AWS_EXECUTION_ENV
  });

  if (isProduction && !isNetlifyDev) {
    // Use @sparticuz/chromium for AWS Lambda
    console.log('[Puppeteer] Using Lambda chromium binary');
    browserInstance = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1920, height: 1080 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  } else {
    // Local development - use system Chrome
    console.log('[Puppeteer] Using local system Chrome');
    browserInstance = await puppeteer.launch({
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
export async function createPage(): Promise<Page> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  // Set realistic browser headers
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

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
export async function scrapeWithPuppeteer<T = string>(
  url: string,
  options: {
    waitFor?: string | number;
    evaluate?: (page: Page) => Promise<T>;
    screenshot?: boolean;
  } = {}
): Promise<T> {
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
      } else {
        console.log(`[Puppeteer] Waiting ${options.waitFor}ms`);
        await new Promise(resolve => setTimeout(resolve, options.waitFor));
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
    } else {
      const html = await page.content();
      return html as T;
    }
  } catch (error) {
    console.error(`[Puppeteer] Error scraping ${url}:`, error);
    throw error;
  } finally {
    await page.close();
  }
}

/**
 * Close the browser instance
 * Call this when done with all scraping to free resources
 */
export async function closeBrowser(): Promise<void> {
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
export async function scrapeCalendarEvents(
  url: string,
  selector: string,
  extractor: (element: Element) => any
): Promise<any[]> {
  return await scrapeWithPuppeteer(url, {
    waitFor: selector,
    evaluate: async (page) => {
      // eslint-disable-next-line no-undef
      return await page.evaluate((sel, extractorStr) => {
        const extractorFn = new Function('element', `return (${extractorStr})(element);`) as (el: Element) => any;
        const elements = Array.from(document.querySelectorAll(sel));
        return elements.map(el => extractorFn(el));
      }, selector, extractor.toString());
    },
  });
}
