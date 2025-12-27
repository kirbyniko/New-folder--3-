/**
 * Script to integrate all local city scrapers into their respective state scrapers
 * 
 * This ensures that capital cities and major municipalities are included in state data
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface LocalScraperMapping {
  stateCode: string;
  stateName: string;
  stateFile: string;
  localScrapers: {
    cityName: string;
    localFile: string;
    functionName: string;
  }[];
}

const mappings: LocalScraperMapping[] = [
  {
    stateCode: 'AL',
    stateName: 'Alabama',
    stateFile: 'alabama.ts',
    localScrapers: [
      { cityName: 'Montgomery', localFile: 'montgomery.ts', functionName: 'scrapeMontgomeryMeetings' },
      { cityName: 'Birmingham', localFile: 'birmingham.ts', functionName: 'scrapeBirminghamMeetings' },
    ]
  },
  {
    stateCode: 'AK',
    stateName: 'Alaska',
    stateFile: 'alaska.ts',
    localScrapers: [
      { cityName: 'Juneau', localFile: 'juneau.ts', functionName: 'scrapeJuneauMeetings' },
    ]
  },
  {
    stateCode: 'AR',
    stateName: 'Arkansas',
    stateFile: 'arkansas.ts',
    localScrapers: [
      { cityName: 'Little Rock', localFile: 'little-rock.ts', functionName: 'scrapeLittleRockMeetings' },
    ]
  },
  {
    stateCode: 'CT',
    stateName: 'Connecticut',
    stateFile: 'connecticut.ts',
    localScrapers: [
      { cityName: 'Bridgeport', localFile: 'bridgeport.ts', functionName: 'scrapeBridgeportMeetings' },
    ]
  },
  {
    stateCode: 'ID',
    stateName: 'Idaho',
    stateFile: 'idaho.ts',
    localScrapers: [
      { cityName: 'Boise', localFile: 'boise.ts', functionName: 'scrapeBoiseMeetings' },
    ]
  },
  {
    stateCode: 'IA',
    stateName: 'Iowa',
    stateFile: 'iowa.ts',
    localScrapers: [
      { cityName: 'Des Moines', localFile: 'des-moines.ts', functionName: 'scrapeDesMoinesMeetings' },
    ]
  },
  {
    stateCode: 'KY',
    stateName: 'Kentucky',
    stateFile: 'kentucky.ts',
    localScrapers: [
      { cityName: 'Lexington', localFile: 'lexington.ts', functionName: 'scrapeLexingtonMeetings' },
    ]
  },
  {
    stateCode: 'LA',
    stateName: 'Louisiana',
    stateFile: 'louisiana.ts',
    localScrapers: [
      { cityName: 'Baton Rouge', localFile: 'baton-rouge.ts', functionName: 'scrapeBatonRougeMeetings' },
    ]
  },
  {
    stateCode: 'MS',
    stateName: 'Mississippi',
    stateFile: 'mississippi.ts',
    localScrapers: [
      { cityName: 'Jackson', localFile: 'jackson.ts', functionName: 'scrapeJacksonMeetings' },
    ]
  },
  {
    stateCode: 'MT',
    stateName: 'Montana',
    stateFile: 'montana.ts',
    localScrapers: [
      { cityName: 'Helena', localFile: 'helena.ts', functionName: 'scrapeHelenaMeetings' },
    ]
  },
  {
    stateCode: 'NV',
    stateName: 'Nevada',
    stateFile: 'nevada.ts',
    localScrapers: [
      { cityName: 'Las Vegas', localFile: 'las-vegas.ts', functionName: 'scrapeLasVegasMeetings' },
    ]
  },
  {
    stateCode: 'NM',
    stateName: 'New Mexico',
    stateFile: 'new-mexico.ts',
    localScrapers: [
      { cityName: 'Santa Fe', localFile: 'santa-fe.ts', functionName: 'scrapeSantaFeMeetings' },
    ]
  },
  {
    stateCode: 'NY',
    stateName: 'New York',
    stateFile: 'new-york.ts',
    localScrapers: [
      { cityName: 'NYC', localFile: 'nyc-council.ts', functionName: 'scrapeNYCCouncilMeetings' },
    ]
  },
  {
    stateCode: 'OK',
    stateName: 'Oklahoma',
    stateFile: 'oklahoma.ts',
    localScrapers: [
      { cityName: 'Oklahoma City', localFile: 'oklahoma-city.ts', functionName: 'scrapeOklahomaCityMeetings' },
    ]
  },
  {
    stateCode: 'OR',
    stateName: 'Oregon',
    stateFile: 'oregon.ts',
    localScrapers: [
      { cityName: 'Portland', localFile: 'portland.ts', functionName: 'scrapePortlandMeetings' },
    ]
  },
  {
    stateCode: 'UT',
    stateName: 'Utah',
    stateFile: 'utah.ts',
    localScrapers: [
      { cityName: 'Salt Lake City', localFile: 'salt-lake-city.ts', functionName: 'scrapeSaltLakeCityMeetings' },
    ]
  },
  {
    stateCode: 'VT',
    stateName: 'Vermont',
    stateFile: 'vermont.ts',
    localScrapers: [
      { cityName: 'Montpelier', localFile: 'montpelier.ts', functionName: 'scrapeMontpelierMeetings' },
    ]
  },
];

const STATES_DIR = join(process.cwd(), 'lib', 'functions', 'utils', 'scrapers', 'states');

console.log('🔍 Analyzing state scrapers for local scraper integration...\n');

for (const mapping of mappings) {
  const filePath = join(STATES_DIR, mapping.stateFile);
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    
    // Check which local scrapers are already imported
    const missingScrapers = mapping.localScrapers.filter(local => {
      return !content.includes(local.functionName);
    });
    
    if (missingScrapers.length === 0) {
      console.log(`✅ ${mapping.stateName} (${mapping.stateCode}): All local scrapers integrated`);
    } else {
      console.log(`❌ ${mapping.stateName} (${mapping.stateCode}): Missing ${missingScrapers.length} scraper(s)`);
      missingScrapers.forEach(scraper => {
        console.log(`   - ${scraper.cityName} (${scraper.functionName})`);
      });
    }
  } catch (error) {
    console.log(`⚠️  ${mapping.stateName} (${mapping.stateCode}): State file not found (${mapping.stateFile})`);
  }
}

console.log('\n📊 Summary:');
const totalStates = mappings.length;
const totalLocalScrapers = mappings.reduce((sum, m) => sum + m.localScrapers.length, 0);
console.log(`- ${totalStates} states with local scrapers`);
console.log(`- ${totalLocalScrapers} total local city scrapers`);
console.log(`- Run this script to see integration status before bulk updates`);
