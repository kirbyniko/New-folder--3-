import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import axios from 'axios';
import crypto from 'crypto';
import { Pool } from 'pg';
import type { 
  ScraperConfig, 
  PageStructure, 
  ScraperField, 
  NavigationStep,
  SelectorStep,
  ScraperCondition 
} from '../types.js';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'scraper_platform',
  user: 'postgres',
  password: 'password'
});

interface ScrapedItem {
  [key: string]: any;
}

interface EngineOptions {
  headless?: boolean;
  maxPages?: number;
  saveToDatabase?: boolean;
  verbose?: boolean;
}

export class ScraperEngine {
  private browser?: Browser;
  private page?: Page;
  private config: ScraperConfig;
  private options: EngineOptions;
  private runId?: number;
  
  constructor(config: ScraperConfig, options: EngineOptions = {}) {
    this.config = config;
    this.options = {
      headless: true,
      maxPages: 10,
      saveToDatabase: true,
      verbose: false,
      ...options
    };
  }

  async run(): Promise<ScrapedItem[]> {
    const startTime = Date.now();
    let scrapedItems: ScrapedItem[] = [];
    let error: string | undefined;

    try {
      this.log(`🚀 Starting scraper: ${this.config.name}`);
      
      // Initialize run record
      if (this.options.saveToDatabase) {
        this.runId = await this.createRunRecord();
      }

      // Initialize browser if needed
      if (this.config.requiresPuppeteer) {
        await this.initBrowser();
      }

      // Execute scraper
      scrapedItems = await this.scrape();

      // Save to database
      if (this.options.saveToDatabase && scrapedItems.length > 0) {
        await this.saveScrapedData(scrapedItems);
      }

      this.log(`✅ Scraper completed: ${scrapedItems.length} items found`);

    } catch (err: any) {
      error = err.message;
      this.log(`❌ Error: ${error}`);
      throw err;

    } finally {
      // Update run record
      if (this.runId && this.options.saveToDatabase) {
        await this.updateRunRecord(
          scrapedItems.length,
          error ? 'error' : 'completed',
          error
        );
      }

      // Cleanup
      await this.cleanup();
    }

    return scrapedItems;
  }

  private async scrape(): Promise<ScrapedItem[]> {
    const items: ScrapedItem[] = [];
    
    // Navigate to start URL
    await this.navigate(this.config.startUrl);

    // Execute navigation steps (e.g., wait for elements, click filters)
    if (this.config.navigationSteps) {
      for (const step of this.config.navigationSteps) {
        await this.executeNavigationStep(step);
      }
    }

    // Find calendar/list page structure
    const listPage = this.config.pageStructures.find(
      ps => ps.pageType === 'calendar' || ps.pageType === 'list'
    );

    if (!listPage) {
      throw new Error('No list or calendar page structure found');
    }

    // Paginate through pages
    let pageCount = 0;
    let hasNextPage = true;

    while (hasNextPage && pageCount < (this.options.maxPages || 10)) {
      this.log(`📄 Scraping page ${pageCount + 1}`);

      // Scrape current page
      const pageItems = await this.scrapePageStructure(listPage);
      items.push(...pageItems);

      this.log(`  Found ${pageItems.length} items on this page`);

      // Check for next page
      if (listPage.hasPagination && listPage.nextButtonSelector) {
        hasNextPage = await this.clickNextPage(listPage.nextButtonSelector);
        if (hasNextPage) {
          await this.delay(1000); // Wait for page load
        }
      } else {
        hasNextPage = false;
      }

      pageCount++;
    }

    return items;
  }

  private async scrapePageStructure(pageStructure: PageStructure): Promise<ScrapedItem[]> {
    const items: ScrapedItem[] = [];
    
    // Get HTML content
    const html = await this.getPageHTML();
    const $ = cheerio.load(html);

    // Find all items
    let itemElements: cheerio.Element[];
    
    if (pageStructure.containerSelector && pageStructure.itemSelector) {
      // Container + item selector pattern
      itemElements = $(pageStructure.containerSelector)
        .find(pageStructure.itemSelector)
        .toArray();
    } else if (pageStructure.itemSelector) {
      // Just item selector
      itemElements = $(pageStructure.itemSelector).toArray();
    } else {
      this.log('⚠️ No item selector found, scraping single page');
      itemElements = [$('body')[0]];
    }

    this.log(`  Found ${itemElements.length} item elements`);

    // Extract data from each item
    for (let i = 0; i < itemElements.length; i++) {
      const itemData: ScrapedItem = {};
      
      for (const field of pageStructure.fields) {
        try {
          const value = await this.extractField(field, $(itemElements[i]), i);
          if (value !== null && value !== undefined) {
            itemData[field.fieldName] = value;
          }
        } catch (err: any) {
          this.log(`  ⚠️ Error extracting field '${field.fieldName}': ${err.message}`);
          if (field.isRequired) {
            throw err;
          }
        }
      }

      // Check if we need to navigate to detail page
      const detailPage = this.config.pageStructures.find(ps => ps.pageType === 'detail');
      if (detailPage && itemData.url) {
        const detailData = await this.scrapeDetailPage(itemData.url as string, detailPage);
        Object.assign(itemData, detailData);
      }

      items.push(itemData);
    }

    return items;
  }

  private async extractField(
    field: ScraperField, 
    $item: cheerio.Cheerio, 
    itemIndex: number
  ): Promise<any> {
    if (!field.selectorSteps || field.selectorSteps.length === 0) {
      return field.defaultValue || null;
    }

    let value: any = null;

    // Execute multi-step extraction
    for (let stepIdx = 0; stepIdx < field.selectorSteps.length; stepIdx++) {
      const step = field.selectorSteps[stepIdx];

      switch (step.actionType) {
        case 'click':
          // For Puppeteer-based scrapers, click the element
          if (this.page) {
            try {
              await this.page.waitForSelector(step.selector, { timeout: 5000 });
              
              // Click the Nth occurrence (based on itemIndex)
              const elements = await this.page.$$(step.selector);
              if (elements[itemIndex]) {
                await elements[itemIndex].click();
                
                if (step.waitAfter) {
                  await this.delay(step.waitAfter);
                }
              }
            } catch (err) {
              this.log(`  ⚠️ Click failed: ${step.selector}`);
            }
          }
          break;

        case 'hover':
          if (this.page) {
            try {
              await this.page.waitForSelector(step.selector, { timeout: 5000 });
              const elements = await this.page.$$(step.selector);
              if (elements[itemIndex]) {
                await elements[itemIndex].hover();
                
                if (step.waitAfter) {
                  await this.delay(step.waitAfter);
                }
              }
            } catch (err) {
              this.log(`  ⚠️ Hover failed: ${step.selector}`);
            }
          }
          break;

        case 'wait':
          if (step.waitAfter) {
            await this.delay(step.waitAfter);
          }
          break;

        case 'extract':
          // Extract value from element
          if (step.selector) {
            // Check if current element matches selector
            let element = $item.is(step.selector) ? $item : $item.find(step.selector).first();
            
            if (element.length > 0) {
              if (step.attributeName) {
                value = element.attr(step.attributeName);
              } else if (field.fieldType === 'html') {
                value = element.html();
              } else {
                value = element.text().trim();
              }
            }
          }
          break;
      }
    }

    // Apply transformations
    if (value && field.transformation) {
      value = this.applyTransformation(value, field.transformation);
    }

    // Validate
    if (field.validationRegex && value) {
      const regex = new RegExp(field.validationRegex);
      if (!regex.test(value)) {
        this.log(`  ⚠️ Validation failed for field '${field.fieldName}': ${value}`);
        return field.defaultValue || null;
      }
    }

    return value;
  }

  private async scrapeDetailPage(url: string, detailPage: PageStructure): Promise<ScrapedItem> {
    this.log(`  📖 Fetching detail page: ${url}`);
    
    // Navigate to detail page
    await this.navigate(url);
    await this.delay(1000);

    // Get HTML
    const html = await this.getPageHTML();
    const $ = cheerio.load(html);

    const detailData: ScrapedItem = {};

    // Extract fields
    for (const field of detailPage.fields) {
      try {
        const value = await this.extractField(field, $('body'), 0);
        if (value !== null && value !== undefined) {
          detailData[field.fieldName] = value;
        }
      } catch (err: any) {
        this.log(`  ⚠️ Error extracting detail field '${field.fieldName}': ${err.message}`);
      }
    }

    return detailData;
  }

  private applyTransformation(value: string, transformation: string): any {
    switch (transformation) {
      case 'trim':
        return value.trim();
      
      case 'lowercase':
        return value.toLowerCase();
      
      case 'uppercase':
        return value.toUpperCase();
      
      case 'parse_date':
        const date = new Date(value);
        return isNaN(date.getTime()) ? value : date.toISOString();
      
      case 'extract_number':
        const match = value.match(/\d+/);
        return match ? parseInt(match[0]) : null;
      
      default:
        return value;
    }
  }

  private async executeNavigationStep(step: NavigationStep): Promise<void> {
    this.log(`  🧭 Navigation step: ${step.stepType} - ${step.comment || ''}`);

    switch (step.stepType) {
      case 'click':
        if (this.page && step.selector) {
          await this.page.waitForSelector(step.selector, { timeout: 5000 });
          await this.page.click(step.selector);
          await this.delay(500);
        }
        break;

      case 'input':
        if (this.page && step.selector && step.actionValue) {
          await this.page.waitForSelector(step.selector, { timeout: 5000 });
          await this.page.type(step.selector, step.actionValue);
        }
        break;

      case 'wait':
        if (step.waitForSelector && this.page) {
          await this.page.waitForSelector(step.waitForSelector, { timeout: 10000 });
        } else if (step.waitTime) {
          await this.delay(step.waitTime);
        }
        break;

      case 'scroll':
        if (this.page) {
          await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await this.delay(1000);
        }
        break;
    }
  }

  private async clickNextPage(nextButtonSelector: string): Promise<boolean> {
    if (!this.page) return false;

    try {
      // Check if next button exists and is enabled
      const button = await this.page.$(nextButtonSelector);
      if (!button) return false;

      const isDisabled = await this.page.evaluate(
        (sel) => {
          const btn = document.querySelector(sel);
          return btn?.hasAttribute('disabled') || 
                 btn?.classList.contains('disabled') ||
                 btn?.getAttribute('aria-disabled') === 'true';
        },
        nextButtonSelector
      );

      if (isDisabled) return false;

      // Click next button
      await this.page.click(nextButtonSelector);
      await this.delay(2000); // Wait for navigation

      return true;
    } catch (err) {
      return false;
    }
  }

  private async navigate(url: string): Promise<void> {
    if (this.config.requiresPuppeteer && this.page) {
      this.log(`  🌐 Navigating to: ${url}`);
      await this.page.goto(url, { waitUntil: 'networkidle2' });
    }
  }

  private async getPageHTML(): Promise<string> {
    if (this.config.requiresPuppeteer && this.page) {
      return await this.page.content();
    } else {
      // Static scraping with axios
      const response = await axios.get(this.config.startUrl);
      return response.data;
    }
  }

  private async initBrowser(): Promise<void> {
    this.log('  🌐 Launching browser...');
    this.browser = await puppeteer.launch({
      headless: this.options.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1920, height: 1080 });
  }

  private async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }

  private async createRunRecord(): Promise<number> {
    const result = await pool.query(
      `INSERT INTO scraper_runs (scraper_id, status, started_at)
       VALUES ($1, $2, NOW())
       RETURNING id`,
      [this.config.id || 0, 'running']
    );
    return result.rows[0].id;
  }

  private async updateRunRecord(
    itemsFound: number, 
    status: string, 
    errorMessage?: string
  ): Promise<void> {
    await pool.query(
      `UPDATE scraper_runs 
       SET items_found = $1, 
           status = $2, 
           error_message = $3,
           completed_at = NOW()
       WHERE id = $4`,
      [itemsFound, status, errorMessage, this.runId]
    );
  }

  private async saveScrapedData(items: ScrapedItem[]): Promise<void> {
    this.log(`  💾 Saving ${items.length} items to database...`);
    
    for (const item of items) {
      const fingerprint = this.generateFingerprint(item);
      
      try {
        await pool.query(
          `INSERT INTO scraped_data (scraper_id, run_id, data, fingerprint)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (scraper_id, fingerprint) 
           DO UPDATE SET 
             data = $3,
             run_id = $2,
             scraped_at = NOW()`,
          [this.config.id || 0, this.runId, JSON.stringify(item), fingerprint]
        );
      } catch (err: any) {
        this.log(`  ⚠️ Error saving item: ${err.message}`);
      }
    }
  }

  private generateFingerprint(item: ScrapedItem): string {
    // Create stable fingerprint from key fields
    const keyFields = ['url', 'name', 'date', 'title', 'eventUrl']
      .map(key => item[key])
      .filter(v => v)
      .join('|');
    
    return crypto.createHash('sha256').update(keyFields).digest('hex');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private log(message: string): void {
    if (this.options.verbose || !this.options.headless) {
      console.log(message);
    }
  }
}

export default ScraperEngine;
