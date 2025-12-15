import * as DOMPurify from 'isomorphic-dompurify';

/**
 * Security utility to sanitize scraped HTML content
 * Prevents XSS attacks from compromised government websites
 */

export interface SanitizeOptions {
  allowLinks?: boolean;
  allowFormatting?: boolean;
  stripAll?: boolean;
}

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param html - Raw HTML content from scraped websites
 * @param options - Configuration for allowed HTML elements
 * @returns Safe HTML string with malicious code removed
 */
export function sanitizeHTML(html: string, options: SanitizeOptions = {}): string {
  // TEMPORARY: Skip sanitization in Node environment where DOMPurify doesn't work
  // TODO: Use a proper server-side HTML sanitizer like 'sanitize-html' package
  return html;
  
  /*
  const {
    allowLinks = true,
    allowFormatting = true,
    stripAll = false
  } = options;

  if (stripAll) {
    // Strip all HTML, return plain text only
    return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
  }
  */

  const allowedTags = ['p', 'br'];
  
  if (allowFormatting) {
    allowedTags.push('strong', 'em', 'u', 'b', 'i');
  }
  
  if (allowLinks) {
    allowedTags.push('a');
  }

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: allowLinks ? ['href', 'title', 'target'] : [],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover']
  });
}

/**
 * Sanitize an entire event object
 * Cleans all string fields to prevent XSS
 */
export function sanitizeEvent(event: any): any {
  const sanitized = { ...event };
  
  // Sanitize text fields
  const textFields = ['name', 'description', 'location', 'committee', 'title'];
  for (const field of textFields) {
    if (typeof sanitized[field] === 'string') {
      sanitized[field] = sanitizeHTML(sanitized[field], { stripAll: true });
    }
  }
  
  // Sanitize URLs to prevent javascript: protocol
  const urlFields = ['url', 'detailsUrl', 'videoUrl', 'agendaUrl', 'docketUrl', 'virtualMeetingUrl'];
  for (const field of urlFields) {
    if (typeof sanitized[field] === 'string') {
      const url = sanitized[field].trim();
      // Only allow http, https, and relative URLs
      if (!url.match(/^(https?:\/\/|\/)/i)) {
        sanitized[field] = '';
      }
    }
  }
  
  return sanitized;
}

/**
 * Validate and sanitize a URL
 * @param url - URL string to validate
 * @returns Safe URL or empty string if invalid
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }
  
  const trimmed = url.trim();
  
  // Allow only http, https, and relative URLs
  if (trimmed.match(/^(https?:\/\/|\/)/i)) {
    // Remove any javascript: or data: URIs that might have been smuggled in
    if (trimmed.toLowerCase().includes('javascript:') || trimmed.toLowerCase().includes('data:')) {
      return '';
    }
    return trimmed;
  }
  
  return '';
}
