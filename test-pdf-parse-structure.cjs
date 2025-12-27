const pdfParse = require('pdf-parse');

console.log('Type:', typeof pdfParse);
console.log('Constructor:', pdfParse.constructor.name);
console.log('Keys:', Object.keys(pdfParse));
console.log('Default:', pdfParse.default);
console.log('Is function:', typeof pdfParse === 'function');

// Try calling it
const fs = require('fs');
const buffer = fs.readFileSync('temp-bpda.pdf');

pdfParse(buffer).then(data => {
  console.log('\n✅ Success! pdf-parse IS a function');
  console.log('Pages:', data.numpages);
  console.log('Text length:', data.text.length);
}).catch(err => {
  console.log('\n❌ Error:', err.message);
});
