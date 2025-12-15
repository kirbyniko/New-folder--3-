// Attempt to scrape committee IDs by submitting the search form
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

console.log('🔍 Attempting to scrape NH committee IDs...\n');

async function scrapeCommitteeIds() {
  try {
    // Step 1: Get the initial page to extract ViewState
    console.log('📄 Fetching initial page for ViewState...');
    const initialResponse = await fetch('https://www.gencourt.state.nh.us/statstudcomm/');
    const initialHtml = await initialResponse.text();
    
    const $ = cheerio.load(initialHtml);
    const viewState = $('input[name="__VIEWSTATE"]').val();
    const viewStateGenerator = $('input[name="__VIEWSTATEGENERATOR"]').val();
    const eventValidation = $('input[name="__EVENTVALIDATION"]').val();
    
    console.log(`✅ ViewState extracted: ${viewState ? 'Found' : 'Missing'}`);
    
    // Step 2: Submit form to search for active statutory committees
    console.log('\n📋 Submitting search for active statutory committees...');
    
    const formData = new URLSearchParams({
      '__VIEWSTATE': viewState || '',
      '__VIEWSTATEGENERATOR': viewStateGenerator || '',
      '__EVENTVALIDATION': eventValidation || '',
      'ctl00$pageBody$StatAct': 'on',  // Active statutory committees checkbox
      'ctl00$pageBody$cmdsubmit': 'Submit'
    });
    
    const searchResponse = await fetch('https://www.gencourt.state.nh.us/statstudcomm/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://www.gencourt.state.nh.us/statstudcomm/'
      },
      body: formData.toString()
    });
    
    const searchHtml = await searchResponse.text();
    const $results = cheerio.load(searchHtml);
    
    // Look for committee links in results
    const committees = [];
    $results('a[href*="details.aspx"]').each((i, elem) => {
      const href = $results(elem).attr('href');
      const text = $results(elem).text().trim();
      
      if (href) {
        const idMatch = href.match(/id=(\d+)/);
        const chapterMatch = href.match(/txtchapternumber=([^&"]+)/);
        
        if (idMatch && chapterMatch) {
          committees.push({
            name: text,
            id: idMatch[1],
            chapter: decodeURIComponent(chapterMatch[1])
          });
        }
      }
    });
    
    if (committees.length > 0) {
      console.log(`\n✅ Found ${committees.length} committees!\n`);
      
      console.log('📋 Committee Mappings (ready to paste into code):\n');
      committees.slice(0, 15).forEach(comm => {
        const normalizedName = comm.name.toUpperCase()
          .replace(/^NH (HOUSE|SENATE) - /, '')
          .trim();
        console.log(`  '${normalizedName}': { id: '${comm.id}', chapter: '${comm.chapter}' },`);
      });
      
      console.log(`\n💡 Showing first 15 of ${committees.length} committees`);
    } else {
      console.log('\n❌ No committee links found in search results');
      console.log('💡 The page likely still uses JavaScript to load results');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

scrapeCommitteeIds();
