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
import { VirginiaScraper } from './states/virginia';
import { WashingtonScraper } from './states/washington';
import { ArizonaScraper } from './states/arizona';
import { TennesseeScraper } from './states/tennessee';
import { MassachusettsScraper } from './states/massachusetts';
import { IndianaScraper } from './states/indiana';
import { MarylandScraper } from './states/maryland';
import { MissouriScraper } from './states/missouri';
import { WisconsinScraper } from './states/wisconsin';
import { ColoradoScraper } from './states/colorado';
import { MinnesotaScraper } from './states/minnesota';
import { SouthCarolinaScraper } from './states/southcarolina';
import { AlabamaScraper } from './states/alabama';
import { OklahomaScraper } from './states/oklahoma';
import { ConnecticutScraper } from './states/connecticut';
import { NevadaScraper } from './states/nevada';
import { IowaScraper } from './states/iowa';
import { ArkansasScraper } from './states/arkansas';
import { AlaskaScraper } from './states/alaska';
import { DelawareScraper } from './states/delaware';
import { HawaiiScraper } from './states/hawaii';
import { IdahoScraper } from './states/idaho';
import { KansasScraper } from './states/kansas';
import { MaineScraper } from './states/maine';
import { NewMexicoScraper } from './states/new-mexico';
import { MississippiScraper } from './states/mississippi';
import { MontanaScraper } from './states/montana';
import { NebraskaScraper } from './states/nebraska';
import { UtahScraper } from './states/utah';
import { WyomingScraper } from './states/wyoming';
import { WestVirginiaScraper } from './states/west-virginia';
import { RhodeIslandScraper } from './states/rhode-island';
import { VermontScraper } from './states/vermont';
import { NorthDakotaScraper } from './states/north-dakota';
import { SouthDakotaScraper } from './states/south-dakota';
import { KentuckyScraper } from './states/kentucky';
import { LouisianaScraper } from './states/louisiana';
import { OregonScraper } from './states/oregon';

/**
 * Initialize the scraper registry with all state scrapers
 * Call this once when the application starts
 */
export async function initializeScrapers(): Promise<void> {
  console.log('[SCRAPERS] 🚀 Initializing scraper system...');

  // Register all state scrapers (15 states covering 246M+ people)
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
  Registry.register('VA', new VirginiaScraper());
  Registry.register('WA', new WashingtonScraper());
  Registry.register('AZ', new ArizonaScraper());
  Registry.register('TN', new TennesseeScraper());
  Registry.register('MA', new MassachusettsScraper());
  Registry.register('IN', new IndianaScraper());
  Registry.register('MD', new MarylandScraper());
  Registry.register('MO', new MissouriScraper());
  Registry.register('WI', new WisconsinScraper());
  Registry.register('CO', new ColoradoScraper());
  Registry.register('MN', new MinnesotaScraper());
  Registry.register('SC', new SouthCarolinaScraper());
  Registry.register('AL', new AlabamaScraper());
  Registry.register('OK', new OklahomaScraper());
  Registry.register('CT', new ConnecticutScraper());
  Registry.register('NV', new NevadaScraper());
  Registry.register('IA', new IowaScraper());
  Registry.register('AR', new ArkansasScraper());
  Registry.register('AK', new AlaskaScraper());
  Registry.register('DE', new DelawareScraper());
  Registry.register('HI', new HawaiiScraper());
  Registry.register('ID', new IdahoScraper());
  Registry.register('KS', new KansasScraper());
  Registry.register('ME', new MaineScraper());
  Registry.register('NM', new NewMexicoScraper());
  Registry.register('MS', new MississippiScraper());
  Registry.register('MT', new MontanaScraper());
  Registry.register('NE', new NebraskaScraper());
  Registry.register('UT', new UtahScraper());
  Registry.register('WY', new WyomingScraper());
  Registry.register('WV', new WestVirginiaScraper());
  Registry.register('RI', new RhodeIslandScraper());
  Registry.register('VT', new VermontScraper());
  Registry.register('ND', new NorthDakotaScraper());
  Registry.register('SD', new SouthDakotaScraper());
  Registry.register('KY', new KentuckyScraper());
  Registry.register('LA', new LouisianaScraper());
  Registry.register('OR', new OregonScraper());

  // Log registry status
  Registry.logStatus();

  console.log('[SCRAPERS] ✅ Scraper system initialized');
}
