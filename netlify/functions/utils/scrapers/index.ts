/**
 * Scraper System Entry Point
 * 
 * Exports all scraper utilities and initializes the registry
 */

export { BaseScraper } from './base-scraper';
export type { ScraperConfig, RawEvent, ScraperHealth } from './base-scraper';

export { ScraperRegistry } from './scraper-registry';
export type { RegistryStats } from './scraper-registry';

export { CacheManager } from './cache-manager';
export type { CacheEntry, CacheStats } from './cache-manager';

export * from './html-parser';
export * from './date-parser';

// Import registry and state scrapers for initialization
import { ScraperRegistry as Registry } from './scraper-registry';
import { NewHampshireScraper } from './states/new-hampshire';
import { CaliforniaScraper } from './states/california';
import { TexasScraper } from './states/texas';
import { FloridaScraper } from './states/florida';
import { NewYorkScraper } from './states/new-york';
import { PennsylvaniaScraper } from './states/pennsylvania';
import { IllinoisScraper } from './states/illinois';
import { OhioScraper } from './states/ohio';
import { GeorgiaScraper } from './states/georgia';
import { NorthCarolinaScraper } from './states/north-carolina';
import { MichiganScraper } from './states/michigan';
import { NewJerseyScraper } from './states/new-jersey';

/**
 * Initialize the scraper registry with all state scrapers
 * Call this once when the application starts
 */
export async function initializeScrapers(): Promise<void> {
  console.log('[SCRAPERS] 🚀 Initializing scraper system...');

  // Register all state scrapers (12 states covering 220M+ people)
  Registry.register('NH', new NewHampshireScraper());
  Registry.register('CA', new CaliforniaScraper());
  Registry.register('TX', new TexasScraper());
  Registry.register('FL', new FloridaScraper());
  Registry.register('NY', new NewYorkScraper());
  Registry.register('PA', new PennsylvaniaScraper());
  Registry.register('IL', new IllinoisScraper());
  Registry.register('OH', new OhioScraper());
  Registry.register('GA', new GeorgiaScraper());
  Registry.register('NC', new NorthCarolinaScraper());
  Registry.register('MI', new MichiganScraper());
  Registry.register('NJ', new NewJerseyScraper());

  // Log registry status
  Registry.logStatus();

  console.log('[SCRAPERS] ✅ Scraper system initialized');
}
