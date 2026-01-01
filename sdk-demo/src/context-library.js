// Pre-loaded context files for agent knowledge
export const contextLibrary = {
  puppeteer_guide: {
    name: "Puppeteer Scraping Guide",
    description: "Complete guide for Puppeteer web scraping with examples",
    content: `# Puppeteer Web Scraping Guide

## Basic Setup
\`\`\`javascript
const puppeteer = require('puppeteer');

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
const page = await browser.newPage();
\`\`\`

## Navigation & Waiting
\`\`\`javascript
// Navigate to page
await page.goto('https://example.com', { waitUntil: 'networkidle2' });

// Wait for selector
await page.waitForSelector('.product-item', { timeout: 5000 });

// Wait for navigation
await Promise.all([
  page.waitForNavigation({ waitUntil: 'networkidle2' }),
  page.click('a.next-page')
]);
\`\`\`

## Data Extraction
\`\`\`javascript
// Extract single element
const title = await page.$eval('h1', el => el.textContent);

// Extract multiple elements
const items = await page.$$eval('.item', elements => 
  elements.map(el => ({
    title: el.querySelector('.title')?.textContent,
    price: el.querySelector('.price')?.textContent,
    link: el.querySelector('a')?.href
  }))
);

// Complex extraction with page.evaluate
const data = await page.evaluate(() => {
  const results = [];
  document.querySelectorAll('.product').forEach(product => {
    results.push({
      name: product.querySelector('.name')?.textContent?.trim(),
      price: parseFloat(product.querySelector('.price')?.textContent?.replace(/[^0-9.]/g, '')),
      image: product.querySelector('img')?.src
    });
  });
  return results;
});
\`\`\`

## Handling Dynamic Content
\`\`\`javascript
// Scroll to load more
await page.evaluate(() => {
  window.scrollTo(0, document.body.scrollHeight);
});
await page.waitForTimeout(2000);

// Click "Load More" button
await page.click('button.load-more');
await page.waitForSelector('.new-items');

// Handle infinite scroll
let previousHeight = 0;
while (true) {
  const currentHeight = await page.evaluate(() => document.body.scrollHeight);
  if (currentHeight === previousHeight) break;
  previousHeight = currentHeight;
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);
}
\`\`\`

## Pagination
\`\`\`javascript
let allData = [];
let currentPage = 1;

while (true) {
  // Extract data from current page
  const pageData = await page.$$eval('.item', items => 
    items.map(item => ({ title: item.textContent }))
  );
  allData = allData.concat(pageData);
  
  // Check for next page
  const hasNext = await page.$('a.next') !== null;
  if (!hasNext) break;
  
  // Go to next page
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
    page.click('a.next')
  ]);
  currentPage++;
}
\`\`\`

## Error Handling
\`\`\`javascript
try {
  await page.goto(url, { 
    waitUntil: 'networkidle2',
    timeout: 30000 
  });
  
  // Check for specific error messages
  const errorMsg = await page.$eval('.error', el => el.textContent).catch(() => null);
  if (errorMsg) {
    throw new Error(\`Site error: \${errorMsg}\`);
  }
  
  // Extract data
  const data = await page.$$eval('.item', items => /* ... */);
  
} catch (error) {
  console.error('Scraping failed:', error.message);
  // Fallback or retry logic
} finally {
  await browser.close();
}
\`\`\`

## Best Practices
1. Always close browser: \`await browser.close();\`
2. Set user agent: \`await page.setUserAgent('...');\`
3. Use timeouts to prevent hanging
4. Handle network errors gracefully
5. Respect robots.txt and rate limits
6. Use headless mode for production
7. Clear cookies between sessions if needed
`
  },
  
  cheerio_guide: {
    name: "Cheerio HTML Parsing Guide",
    description: "Fast HTML parsing with Cheerio (jQuery-like syntax)",
    content: `# Cheerio HTML Parsing Guide

## Basic Setup
\`\`\`javascript
const cheerio = require('cheerio');
const axios = require('axios');

// Fetch HTML
const { data: html } = await axios.get('https://example.com');
const $ = cheerio.load(html);
\`\`\`

## Selecting Elements
\`\`\`javascript
// Single element
const title = $('h1').text();
const firstLink = $('a').first().attr('href');

// Multiple elements
$('li').each((i, elem) => {
  const text = $(elem).text();
  console.log(text);
});

// With array map
const links = $('a').map((i, el) => $(el).attr('href')).get();

// Complex selectors
const prices = $('.product .price').map((i, el) => $(el).text()).get();
\`\`\`

## Data Extraction Patterns
\`\`\`javascript
// Extract structured data
const products = [];
$('.product-item').each((i, elem) => {
  const $elem = $(elem);
  products.push({
    title: $elem.find('.title').text().trim(),
    price: parseFloat($elem.find('.price').text().replace(/[^0-9.]/g, '')),
    image: $elem.find('img').attr('src'),
    link: $elem.find('a').attr('href'),
    rating: $elem.find('.rating').attr('data-rating')
  });
});

// Table extraction
const tableData = [];
$('table tbody tr').each((i, row) => {
  const $row = $(row);
  tableData.push({
    col1: $row.find('td').eq(0).text().trim(),
    col2: $row.find('td').eq(1).text().trim(),
    col3: $row.find('td').eq(2).text().trim()
  });
});

// Nested lists
const categories = [];
$('.category').each((i, cat) => {
  const $cat = $(cat);
  categories.push({
    name: $cat.find('> .name').text(),
    items: $cat.find('.item').map((j, item) => $(item).text()).get()
  });
});
\`\`\`

## Advanced Techniques
\`\`\`javascript
// Text cleaning
const cleanText = (text) => text.replace(/\\s+/g, ' ').trim();

// Safe extraction with fallbacks
const safeText = (selector, defaultValue = '') => {
  const elem = $(selector);
  return elem.length ? elem.text().trim() : defaultValue;
};

// Extract from attributes
const imageUrls = $('img[src]').map((i, el) => $(el).attr('src')).get();

// Filter elements
const validLinks = $('a').filter((i, el) => {
  const href = $(el).attr('href');
  return href && href.startsWith('http');
}).map((i, el) => $(el).attr('href')).get();

// Parent/sibling navigation
const label = $('.input-field').prev('label').text();
const value = $('.label').next('.value').text();
\`\`\`

## Common Patterns
\`\`\`javascript
// Price extraction
const extractPrice = (priceText) => {
  const match = priceText.match(/[0-9,]+\\.?[0-9]*/);
  return match ? parseFloat(match[0].replace(/,/g, '')) : null;
};

// Date parsing
const extractDate = (dateText) => {
  return new Date(dateText.trim());
};

// URL normalization
const normalizeUrl = (url, baseUrl) => {
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return baseUrl + url;
  return baseUrl + '/' + url;
};
\`\`\`

## Error Handling
\`\`\`javascript
try {
  const { data: html } = await axios.get(url, { timeout: 10000 });
  const $ = cheerio.load(html);
  
  // Check if expected elements exist
  if ($('.product').length === 0) {
    throw new Error('No products found - page structure may have changed');
  }
  
  const data = $('.product').map((i, el) => {
    const $el = $(el);
    return {
      title: $el.find('.title').text() || 'Unknown',
      price: extractPrice($el.find('.price').text()) || 0
    };
  }).get();
  
  console.log(JSON.stringify(data, null, 2));
  
} catch (error) {
  console.error('Scraping error:', error.message);
}
\`\`\`
`
  },
  
  axios_guide: {
    name: "Axios HTTP Requests Guide",
    description: "Making HTTP requests with Axios",
    content: `# Axios HTTP Requests Guide

## Basic GET Request
\`\`\`javascript
const axios = require('axios');

const response = await axios.get('https://api.example.com/data');
console.log(response.data);
console.log(response.status); // 200
console.log(response.headers);
\`\`\`

## POST Request
\`\`\`javascript
const response = await axios.post('https://api.example.com/submit', {
  name: 'John',
  email: 'john@example.com'
});
console.log(response.data);
\`\`\`

## Custom Headers
\`\`\`javascript
const response = await axios.get('https://api.example.com/data', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Authorization': 'Bearer token123',
    'Accept': 'application/json'
  }
});
\`\`\`

## Query Parameters
\`\`\`javascript
const response = await axios.get('https://api.example.com/search', {
  params: {
    q: 'javascript',
    page: 1,
    limit: 20
  }
});
// Request: https://api.example.com/search?q=javascript&page=1&limit=20
\`\`\`

## Timeout & Error Handling
\`\`\`javascript
try {
  const response = await axios.get('https://api.example.com/data', {
    timeout: 5000 // 5 seconds
  });
  console.log(response.data);
} catch (error) {
  if (error.response) {
    // Server responded with error status
    console.error('Status:', error.response.status);
    console.error('Data:', error.response.data);
  } else if (error.request) {
    // Request made but no response
    console.error('No response received');
  } else {
    // Error setting up request
    console.error('Error:', error.message);
  }
}
\`\`\`

## Following Redirects
\`\`\`javascript
const response = await axios.get('https://short.url/abc', {
  maxRedirects: 5,
  validateStatus: (status) => status < 500
});
\`\`\`

## Retrying Failed Requests
\`\`\`javascript
async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await axios.get(url);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
\`\`\`
`
  },
  
  error_handling: {
    name: "Error Handling Best Practices",
    description: "Patterns for robust error handling in web scraping",
    content: `# Error Handling Best Practices

## Common Error Types
1. **Network Errors**: Timeout, DNS failure, connection refused
2. **HTTP Errors**: 404, 403, 500, 401
3. **Parse Errors**: Invalid HTML, unexpected structure
4. **Rate Limiting**: 429 Too Many Requests
5. **CAPTCHA/Bot Detection**: Access denied

## Try-Catch Patterns
\`\`\`javascript
async function scrapeWithErrorHandling(url) {
  try {
    const response = await axios.get(url, { timeout: 10000 });
    const $ = cheerio.load(response.data);
    
    // Validate response
    if ($('.expected-element').length === 0) {
      throw new Error('Page structure changed - expected elements not found');
    }
    
    const data = extractData($);
    return { success: true, data };
    
  } catch (error) {
    // Network/timeout errors
    if (error.code === 'ECONNABORTED') {
      return { success: false, error: 'Request timeout', retry: true };
    }
    
    // HTTP errors
    if (error.response) {
      const status = error.response.status;
      if (status === 404) {
        return { success: false, error: 'Page not found' };
      }
      if (status === 403 || status === 401) {
        return { success: false, error: 'Access denied', retry: false };
      }
      if (status === 429) {
        return { success: false, error: 'Rate limited', retry: true, wait: 60 };
      }
    }
    
    // Generic error
    return { success: false, error: error.message, retry: false };
  }
}
\`\`\`

## Retry Logic
\`\`\`javascript
async function retryOperation(fn, maxRetries = 3, delay = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry certain errors
      if (error.response?.status === 404) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        console.log(\`Attempt \${attempt} failed, retrying in \${delay}ms...\`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }
  
  throw lastError;
}

// Usage
const result = await retryOperation(() => scrapeUrl(url));
\`\`\`

## Validation
\`\`\`javascript
function validateData(data) {
  if (!Array.isArray(data)) {
    throw new Error('Expected array of items');
  }
  
  if (data.length === 0) {
    throw new Error('No data extracted - page may be empty or structure changed');
  }
  
  // Validate data structure
  const invalidItems = data.filter(item => !item.title || !item.price);
  if (invalidItems.length > data.length * 0.5) {
    throw new Error('More than 50% of items have missing required fields');
  }
  
  return true;
}
\`\`\`
`
  },
  
  api_patterns: {
    name: "API Integration Patterns",
    description: "Common patterns for working with APIs",
    content: `# API Integration Patterns

## REST API Basics
\`\`\`javascript
// GET with query parameters
const response = await axios.get('https://api.example.com/users', {
  params: { page: 1, limit: 20, sort: 'created_desc' }
});

// POST with JSON body
const newUser = await axios.post('https://api.example.com/users', {
  name: 'John Doe',
  email: 'john@example.com'
});

// PUT to update
const updated = await axios.put(\`https://api.example.com/users/\${id}\`, {
  name: 'Jane Doe'
});

// DELETE
await axios.delete(\`https://api.example.com/users/\${id}\`);
\`\`\`

## Authentication
\`\`\`javascript
// Bearer Token
const api = axios.create({
  baseURL: 'https://api.example.com',
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
});

// API Key
const response = await axios.get('https://api.example.com/data', {
  params: { api_key: 'YOUR_API_KEY' }
});

// Basic Auth
const response = await axios.get('https://api.example.com/data', {
  auth: { username: 'user', password: 'pass' }
});
\`\`\`

## Pagination
\`\`\`javascript
async function fetchAllPages(baseUrl) {
  let allData = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const response = await axios.get(baseUrl, {
      params: { page, limit: 100 }
    });
    
    allData = allData.concat(response.data.items);
    hasMore = response.data.hasMore;
    page++;
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return allData;
}
\`\`\`

## Rate Limiting
\`\`\`javascript
class RateLimiter {
  constructor(requestsPerSecond) {
    this.delay = 1000 / requestsPerSecond;
    this.lastRequest = 0;
  }
  
  async throttle() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    
    if (timeSinceLastRequest < this.delay) {
      await new Promise(resolve => 
        setTimeout(resolve, this.delay - timeSinceLastRequest)
      );
    }
    
    this.lastRequest = Date.now();
  }
}

// Usage
const limiter = new RateLimiter(10); // 10 requests per second

for (const url of urls) {
  await limiter.throttle();
  const data = await axios.get(url);
}
\`\`\`
`
  }
};

export default contextLibrary;
