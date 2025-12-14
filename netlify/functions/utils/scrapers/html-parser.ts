/**
 * HTML Parser Utilities
 * 
 * Wrapper around Cheerio with logging and error handling
 * Provides common patterns for scraping HTML tables, lists, etc.
 */

import * as cheerio from 'cheerio';

export interface ParseOptions {
  trimText?: boolean;
  normalizeWhitespace?: boolean;
  removeEmptyStrings?: boolean;
}

/**
 * Parse HTML string into Cheerio instance
 */
export function parseHTML(html: string, context?: string): cheerio.CheerioAPI {
  try {
    const $ = cheerio.load(html);
    
    console.log('[HTML-PARSER] ✅ Parsed HTML', {
      context,
      size: `${Math.round(html.length / 1024)}KB`,
      title: $('title').text() || 'No title'
    });

    return $ as cheerio.CheerioAPI;
  } catch (error) {
    console.error('[HTML-PARSER] ❌ Failed to parse HTML', {
      context,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Extract text from element with optional normalization
 */
export function extractText(
  element: cheerio.Cheerio,
  options: ParseOptions = {}
): string {
  const defaults: ParseOptions = {
    trimText: true,
    normalizeWhitespace: true,
    removeEmptyStrings: true
  };

  const opts = { ...defaults, ...options };
  let text = element.text();

  if (opts.trimText) {
    text = text.trim();
  }

  if (opts.normalizeWhitespace) {
    // Replace multiple spaces/newlines with single space
    text = text.replace(/\s+/g, ' ').trim();
  }

  return text;
}

/**
 * Extract attribute with fallback
 */
export function extractAttr(
  element: cheerio.Cheerio,
  attrName: string,
  fallback: string = ''
): string {
  const value = element.attr(attrName);
  return value || fallback;
}

/**
 * Parse HTML table into array of objects
 * Assumes first row is headers
 */
export function parseTable(
  $: cheerio.CheerioAPI,
  tableSelector: string,
  options: ParseOptions = {}
): Record<string, string>[] {
  console.log('[HTML-PARSER] 📊 Parsing table', { selector: tableSelector });

  const table = $(tableSelector);
  if (table.length === 0) {
    console.warn('[HTML-PARSER] ⚠️ Table not found', { selector: tableSelector });
    return [];
  }

  const rows: Record<string, string>[] = [];
  
  // Extract headers from first row
  const headers: string[] = [];
  table.find('thead tr th, thead tr td').each((i, th) => {
    const header = extractText($(th), options);
    headers.push(header || `column_${i}`);
  });

  // If no thead, try first tr in tbody
  if (headers.length === 0) {
    table.find('tbody tr:first-child td, tbody tr:first-child th').each((i, td) => {
      const header = extractText($(td), options);
      headers.push(header || `column_${i}`);
    });
  }

  console.log('[HTML-PARSER] 📋 Table headers', { headers });

  // Extract data rows
  const dataRows = headers.length > 0 
    ? table.find('tbody tr:not(:first-child)')
    : table.find('tbody tr');

  dataRows.each((_i, row) => {
    const rowData: Record<string, string> = {};
    $(row).find('td').each((j, cell) => {
      const header = headers[j] || `column_${j}`;
      rowData[header] = extractText($(cell), options);
    });

    // Only add non-empty rows
    if (Object.values(rowData).some(val => val.length > 0)) {
      rows.push(rowData);
    }
  });

  console.log('[HTML-PARSER] ✅ Table parsed', {
    selector: tableSelector,
    rows: rows.length,
    sample: rows[0]
  });

  return rows;
}

/**
 * Parse HTML list (ul/ol) into array of strings
 */
export function parseList(
  $: cheerio.CheerioAPI,
  listSelector: string,
  options: ParseOptions = {}
): string[] {
  console.log('[HTML-PARSER] 📝 Parsing list', { selector: listSelector });

  const list = $(listSelector);
  if (list.length === 0) {
    console.warn('[HTML-PARSER] ⚠️ List not found', { selector: listSelector });
    return [];
  }

  const items: string[] = [];
  list.find('li').each((_i, li) => {
    const text = extractText($(li), options);
    if (text.length > 0 || !options.removeEmptyStrings) {
      items.push(text);
    }
  });

  console.log('[HTML-PARSER] ✅ List parsed', {
    selector: listSelector,
    items: items.length
  });

  return items;
}

/**
 * Extract links from a container
 */
export function extractLinks(
  $: cheerio.CheerioAPI,
  containerSelector: string,
  baseUrl?: string
): Array<{ text: string; href: string }> {
  console.log('[HTML-PARSER] 🔗 Extracting links', { selector: containerSelector });

  const links: Array<{ text: string; href: string }> = [];
  
  $(containerSelector).find('a').each((_i, a) => {
    const $a = $(a);
    let href = extractAttr($a, 'href');
    const text = extractText($a);

    // Resolve relative URLs
    if (baseUrl && href && !href.startsWith('http')) {
      try {
        href = new URL(href, baseUrl).href;
      } catch (e) {
        console.warn('[HTML-PARSER] ⚠️ Invalid URL', { href, baseUrl });
      }
    }

    if (href) {
      links.push({ text, href });
    }
  });

  console.log('[HTML-PARSER] ✅ Links extracted', {
    selector: containerSelector,
    count: links.length
  });

  return links;
}

/**
 * Find element by text content (useful for finding specific rows/cells)
 */
export function findByText(
  $: cheerio.CheerioAPI,
  selector: string,
  searchText: string,
  caseSensitive: boolean = false
): cheerio.Cheerio {
  const elements = $(selector);
  
  const found = elements.filter((_i, el) => {
    const text = extractText($(el));
    
    if (caseSensitive) {
      return text.includes(searchText);
    } else {
      return text.toLowerCase().includes(searchText.toLowerCase());
    }
  });

  console.log('[HTML-PARSER] 🔍 Search by text', {
    selector,
    searchText,
    found: found.length
  });

  return found;
}

/**
 * Check if element exists
 */
export function exists(
  $: cheerio.CheerioAPI,
  selector: string
): boolean {
  const found = $(selector).length > 0;
  
  if (!found) {
    console.log('[HTML-PARSER] ⚠️ Element not found', { selector });
  }
  
  return found;
}

/**
 * Extract all text nodes from element (preserving structure)
 */
export function extractAllText(
  element: cheerio.Cheerio,
  separator: string = '\n'
): string {
  const texts: string[] = [];
  
  element.contents().each((_i, node) => {
    if (node.type === 'text') {
      const text = (node as any).data?.trim();
      if (text) {
        texts.push(text);
      }
    } else if (node.type === 'tag') {
      const childText = extractAllText(element.find(node as any), separator);
      if (childText) {
        texts.push(childText);
      }
    }
  });

  return texts.join(separator);
}

/**
 * Parse date strings commonly found in legislature websites
 */
export function parseCommonDateFormats(dateStr: string): Date | null {
  const cleaned = dateStr.trim().replace(/\s+/g, ' ');
  
  console.log('[HTML-PARSER] 📅 Parsing date', { input: cleaned });

  // Try standard Date parsing first
  const standardParse = new Date(cleaned);
  if (!isNaN(standardParse.getTime())) {
    console.log('[HTML-PARSER] ✅ Date parsed (standard)', {
      input: cleaned,
      output: standardParse.toISOString()
    });
    return standardParse;
  }

  // Try common patterns
  const patterns = [
    // "January 15, 2025"
    /([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/,
    // "1/15/2025" or "01/15/25"
    /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/,
    // "2025-01-15"
    /(\d{4})-(\d{2})-(\d{2})/
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      const parsed = new Date(cleaned);
      if (!isNaN(parsed.getTime())) {
        console.log('[HTML-PARSER] ✅ Date parsed (pattern match)', {
          input: cleaned,
          output: parsed.toISOString()
        });
        return parsed;
      }
    }
  }

  console.warn('[HTML-PARSER] ⚠️ Could not parse date', { input: cleaned });
  return null;
}
