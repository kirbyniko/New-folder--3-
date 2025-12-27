/**
 * Automatically integrate local city scrapers into state scrapers
 * 
 * This script:
 * 1. Adds imports for local scraper functions
 * 2. Adds calls to local scrapers in the scrapeCalendar() method
 * 3. Updates logging to show state vs local event counts
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
      { cityName: 'Montgomery', localFile: 'montgomery', functionName: 'scrapeMontgomeryMeetings' },
      { cityName: 'Birmingham', localFile: 'birmingham', functionName: 'scrapeBirminghamMeetings' },
    ]
  },
  {
    stateCode: 'AR',
    stateName: 'Arkansas',
    stateFile: 'arkansas.ts',
    localScrapers: [
      { cityName: 'Little Rock', localFile: 'little-rock', functionName: 'scrapeLittleRockMeetings' },
    ]
  },
  {
    stateCode: 'CT',
    stateName: 'Connecticut',
    stateFile: 'connecticut.ts',
    localScrapers: [
      { cityName: 'Bridgeport', localFile: 'bridgeport', functionName: 'scrapeBridgeportMeetings' },
    ]
  },
  {
    stateCode: 'ID',
    stateName: 'Idaho',
    stateFile: 'idaho.ts',
    localScrapers: [
      { cityName: 'Boise', localFile: 'boise', functionName: 'scrapeBoiseMeetings' },
    ]
  },
  {
    stateCode: 'IA',
    stateName: 'Iowa',
    stateFile: 'iowa.ts',
    localScrapers: [
      { cityName: 'Des Moines', localFile: 'des-moines', functionName: 'scrapeDesMoinesMeetings' },
    ]
  },
  {
    stateCode: 'KY',
    stateName: 'Kentucky',
    stateFile: 'kentucky.ts',
    localScrapers: [
      { cityName: 'Lexington', localFile: 'lexington', functionName: 'scrapeLexingtonMeetings' },
    ]
  },
  {
    stateCode: 'LA',
    stateName: 'Louisiana',
    stateFile: 'louisiana.ts',
    localScrapers: [
      { cityName: 'Baton Rouge', localFile: 'baton-rouge', functionName: 'scrapeBatonRougeMeetings' },
    ]
  },
  {
    stateCode: 'MS',
    stateName: 'Mississippi',
    stateFile: 'mississippi.ts',
    localScrapers: [
      { cityName: 'Jackson', localFile: 'jackson', functionName: 'scrapeJacksonMeetings' },
    ]
  },
  {
    stateCode: 'MT',
    stateName: 'Montana',
    stateFile: 'montana.ts',
    localScrapers: [
      { cityName: 'Helena', localFile: 'helena', functionName: 'scrapeHelenaMeetings' },
    ]
  },
  {
    stateCode: 'NV',
    stateName: 'Nevada',
    stateFile: 'nevada.ts',
    localScrapers: [
      { cityName: 'Las Vegas', localFile: 'las-vegas', functionName: 'scrapeLasVegasMeetings' },
    ]
  },
  {
    stateCode: 'NM',
    stateName: 'New Mexico',
    stateFile: 'new-mexico.ts',
    localScrapers: [
      { cityName: 'Santa Fe', localFile: 'santa-fe', functionName: 'scrapeSantaFeMeetings' },
    ]
  },
  {
    stateCode: 'NY',
    stateName: 'New York',
    stateFile: 'new-york.ts',
    localScrapers: [
      { cityName: 'NYC', localFile: 'nyc-council', functionName: 'scrapeNYCCouncilMeetings' },
    ]
  },
  {
    stateCode: 'OK',
    stateName: 'Oklahoma',
    stateFile: 'oklahoma.ts',
    localScrapers: [
      { cityName: 'Oklahoma City', localFile: 'oklahoma-city', functionName: 'scrapeOklahomaCityMeetings' },
    ]
  },
  {
    stateCode: 'OR',
    stateName: 'Oregon',
    stateFile: 'oregon.ts',
    localScrapers: [
      { cityName: 'Portland', localFile: 'portland', functionName: 'scrapePortlandMeetings' },
    ]
  },
  {
    stateCode: 'UT',
    stateName: 'Utah',
    stateFile: 'utah.ts',
    localScrapers: [
      { cityName: 'Salt Lake City', localFile: 'salt-lake-city', functionName: 'scrapeSaltLakeCityMeetings' },
    ]
  },
  {
    stateCode: 'VT',
    stateName: 'Vermont',
    stateFile: 'vermont.ts',
    localScrapers: [
      { cityName: 'Montpelier', localFile: 'montpelier', functionName: 'scrapeMontpelierMeetings' },
    ]
  },
];

const STATES_DIR = join(process.cwd(), 'lib', 'functions', 'utils', 'scrapers', 'states');

console.log('🔧 Integrating local scrapers into state scrapers...\n');

let totalUpdated = 0;
let totalSkipped = 0;

for (const mapping of mappings) {
  const filePath = join(STATES_DIR, mapping.stateFile);
  
  try {
    let content = readFileSync(filePath, 'utf-8');
    let modified = false;
    
    // Step 1: Add imports at the top (after existing imports)
    const missingImports = mapping.localScrapers.filter(local => 
      !content.includes(local.functionName)
    );
    
    if (missingImports.length === 0) {
      console.log(`⏭️  ${mapping.stateName}: Already integrated`);
      totalSkipped++;
      continue;
    }
    
    // Find the last import statement
    const importLines = content.split('\n');
    let lastImportIndex = -1;
    for (let i = 0; i < importLines.length; i++) {
      if (importLines[i].trim().startsWith('import ')) {
        lastImportIndex = i;
      }
    }
    
    // Add new imports
    const newImports = missingImports.map(local => 
      `import { ${local.functionName} } from '../local/${local.localFile}.js';`
    );
    
    if (lastImportIndex >= 0) {
      importLines.splice(lastImportIndex + 1, 0, ...newImports);
      content = importLines.join('\n');
      modified = true;
    }
    
    // Step 2: Find scrapeCalendar method and add local scraper calls
    // Look for patterns like: return allEvents; or return events;
    const returnPattern = /(\s+)(console\.log\([^)]*total[^)]*\);?\s*)?(return\s+(?:all)?[Ee]vents;)/;
    const match = content.match(returnPattern);
    
    if (match) {
      const indent = match[1];
      const existingLog = match[2] || '';
      const returnStatement = match[3];
      
      // Build local scraper calls
      const localCalls = missingImports.map(local => `
${indent}// Add ${local.cityName} local government meetings
${indent}console.log('Fetching ${local.cityName} local government meetings...');
${indent}try {
${indent}  const ${local.cityName.toLowerCase().replace(/\s+/g, '')}Events = await ${local.functionName}();
${indent}  console.log(\`Found \${${local.cityName.toLowerCase().replace(/\s+/g, '')}Events.length} ${local.cityName} local meetings\`);
${indent}  allEvents.push(...${local.cityName.toLowerCase().replace(/\s+/g, '')}Events);
${indent}} catch (error) {
${indent}  console.error('Error fetching ${local.cityName} meetings:', error);
${indent}}
`).join('');
      
      // Replace the return statement
      const replacement = `${existingLog}${localCalls}
${indent}console.log(\`Found \${allEvents.length} total ${mapping.stateName} events (state + local)\`);
${indent}${returnStatement}`;
      
      content = content.replace(returnPattern, replacement);
      modified = true;
    }
    
    if (modified) {
      writeFileSync(filePath, content, 'utf-8');
      console.log(`✅ ${mapping.stateName}: Integrated ${missingImports.length} local scraper(s)`);
      missingImports.forEach(s => console.log(`   - ${s.cityName}`));
      totalUpdated++;
    } else {
      console.log(`⚠️  ${mapping.stateName}: Could not find insertion point`);
    }
    
  } catch (error) {
    console.log(`❌ ${mapping.stateName}: Error - ${error.message}`);
  }
}

console.log(`\n📊 Summary:`);
console.log(`- ${totalUpdated} states updated`);
console.log(`- ${totalSkipped} states skipped (already integrated)`);
console.log(`\n✨ Integration complete! Run tests to verify.`);
