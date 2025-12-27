/**
 * Script to add calendarSources to all static event JSON files
 * Reads from scrapers' getCalendarSources() method
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Import all scrapers directly
import { AlaskaScraper } from '../lib/functions/utils/scrapers/states/alaska';
import { AlabamaScraper } from '../lib/functions/utils/scrapers/states/alabama';
import { ArizonaScraper } from '../lib/functions/utils/scrapers/states/arizona';
import { ArkansasScraper } from '../lib/functions/utils/scrapers/states/arkansas';
import { ColoradoScraper } from '../lib/functions/utils/scrapers/states/colorado';
import { ConnecticutScraper } from '../lib/functions/utils/scrapers/states/connecticut';
import { IndianaScraper } from '../lib/functions/utils/scrapers/states/indiana';
import { IowaScraper } from '../lib/functions/utils/scrapers/states/iowa';
import { KentuckyScraper } from '../lib/functions/utils/scrapers/states/kentucky';
import { LouisianaScraper } from '../lib/functions/utils/scrapers/states/louisiana';
import { MarylandScraper } from '../lib/functions/utils/scrapers/states/maryland';
import { MassachusettsScraper } from '../lib/functions/utils/scrapers/states/massachusetts';
import { MinnesotaScraper } from '../lib/functions/utils/scrapers/states/minnesota';
import { MissouriScraper } from '../lib/functions/utils/scrapers/states/missouri';
import { NevadaScraper } from '../lib/functions/utils/scrapers/states/nevada';
import { OklahomaScraper } from '../lib/functions/utils/scrapers/states/oklahoma';
import { OregonScraper } from '../lib/functions/utils/scrapers/states/oregon';
import { SouthCarolinaScraper } from '../lib/functions/utils/scrapers/states/southcarolina';
import { TennesseeScraper } from '../lib/functions/utils/scrapers/states/tennessee';
import { VirginiaScraper } from '../lib/functions/utils/scrapers/states/virginia';
import { WisconsinScraper } from '../lib/functions/utils/scrapers/states/wisconsin';

const DATA_DIR = join(process.cwd(), 'public', 'data');

// Map state codes to scrapers
const scrapers: Record<string, any> = {
  'AK': new AlaskaScraper(),
  'AL': new AlabamaScraper(),
  'AZ': new ArizonaScraper(),
  'AR': new ArkansasScraper(),
  'CO': new ColoradoScraper(),
  'CT': new ConnecticutScraper(),
  'IN': new IndianaScraper(),
  'IA': new IowaScraper(),
  'KY': new KentuckyScraper(),
  'LA': new LouisianaScraper(),
  'MD': new MarylandScraper(),
  'MA': new MassachusettsScraper(),
  'MN': new MinnesotaScraper(),
  'MO': new MissouriScraper(),
  'NV': new NevadaScraper(),
  'OK': new OklahomaScraper(),
  'OR': new OregonScraper(),
  'SC': new SouthCarolinaScraper(),
  'TN': new TennesseeScraper(),
  'VA': new VirginiaScraper(),
  'WI': new WisconsinScraper()
};

async function updateCalendarSources() {
  console.log('📅 Adding calendar sources to static JSON files...\n');

  const files = readdirSync(DATA_DIR).filter(f => f.endsWith('-events.json'));
  
  for (const file of files) {
    const filePath = join(DATA_DIR, file);
    const stateMatch = file.match(/^([a-z]+)-events\.json$/);
    
    if (!stateMatch) continue;
    
    const stateName = stateMatch[1];
    
    // Map file names to state codes
    const stateCodeMap: Record<string, string> = {
      'alaska': 'AK',
      'alabama': 'AL',
      'arizona': 'AZ',
      'arkansas': 'AR',
      'colorado': 'CO',
      'connecticut': 'CT',
      'indiana': 'IN',
      'iowa': 'IA',
      'kentucky': 'KY',
      'louisiana': 'LA',
      'maryland': 'MD',
      'massachusetts': 'MA',
      'minnesota': 'MN',
      'missouri': 'MO',
      'nevada': 'NV',
      'oklahoma': 'OK',
      'oregon': 'OR',
      'southcarolina': 'SC',
      'tennessee': 'TN',
      'virginia': 'VA',
      'wisconsin': 'WI'
    };
    
    const stateCode = stateCodeMap[stateName];
    
    if (!stateCode) {
      console.log(`⚠️  Skipping ${file} - unknown state code`);
      continue;
    }
    
    // Get scraper
    const scraper = scrapers[stateCode];
    
    if (!scraper) {
      console.log(`⚠️  Skipping ${stateCode} - no scraper registered`);
      continue;
    }
    
    // Get calendar sources from scraper
    const calendarSources = scraper.getCalendarSources();
    
    // Read existing JSON
    const data = JSON.parse(readFileSync(filePath, 'utf-8'));
    
    // Update calendarSources
    data.calendarSources = calendarSources;
    
    // Write back
    writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    
    console.log(`✅ ${stateCode}: Added ${calendarSources.length} calendar source(s)`);
    calendarSources.forEach(src => {
      console.log(`   - ${src.name}: ${src.url}`);
    });
    console.log();
  }
  
  console.log('✨ Done!');
}

updateCalendarSources().catch(console.error);
