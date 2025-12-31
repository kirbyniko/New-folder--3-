// Recovery tool for lost scrapers
// Run this in the extension's console to see what's in localStorage

(function() {
  console.log('=== SCRAPER RECOVERY TOOL ===\n');

  // Check localStorage
  const savedScrapers = localStorage.getItem('scrapers');
  if (savedScrapers) {
    const parsed = JSON.parse(savedScrapers);
    console.log(`Found ${parsed.length} scrapers in localStorage:`);
    parsed.forEach((s, i) => {
      console.log(`\n${i + 1}. ${s.name}`);
      console.log(`   Created: ${s.createdAt || 'Unknown'}`);
      console.log(`   Fields: ${Object.keys(s.fields || {}).length}`);
      console.log(`   Has script: ${s.script ? 'Yes' : 'No'}`);
      if (s.script) {
        console.log(`   Script length: ${s.script.length} chars`);
      }
    });
    
    // Provide recovery function
    console.log('\n💾 To export all scrapers, run:');
    console.log('copy(localStorage.getItem("scrapers"))');
    console.log('Then paste into a file to backup.');
  } else {
    console.log('❌ No scrapers found in localStorage');
  }

  // Check all localStorage keys
  console.log('\n=== All localStorage keys ===');
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);
    console.log(`${key}: ${value?.substring(0, 100)}${value?.length > 100 ? '...' : ''}`);
  }

  // Check chrome.storage.local
  console.log('\n=== Checking chrome.storage.local ===');
  chrome.storage.local.get(null, (items) => {
    console.log('Chrome storage items:', Object.keys(items));
    if (items.builderFieldValues) {
      console.log('\n📝 Builder field values found:');
      console.log(items.builderFieldValues);
    }
    if (items.activeBuilderTemplate) {
      console.log('\n📋 Active builder template:');
      console.log(items.activeBuilderTemplate);
    }
    if (items.builderStepValues) {
      console.log('\n🔢 Builder step values:');
      console.log(items.builderStepValues);
    }
  });

  console.log('\n=== RECOVERY COMPLETE ===');
  console.log('If you see scraper data above, you can restore it.');
})();
