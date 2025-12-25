/**
 * URL Security Utilities
 * Prevents SSRF attacks in Puppeteer scrapers
 */

/**
 * Check if a URL is safe for Puppeteer scraping
 * Blocks localhost, private IPs, and non-government domains
 */
export function isAllowedScraperUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    
    // Block dangerous protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      console.warn(`⚠️ Blocked non-HTTP(S) protocol: ${parsed.protocol}`);
      return false;
    }
    
    // Block localhost and loopback addresses
    const localhostPatterns = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '::1',
      '169.254.169.254' // AWS metadata service
    ];
    
    const hostname = parsed.hostname.toLowerCase();
    if (localhostPatterns.some(pattern => hostname === pattern || hostname.includes(pattern))) {
      console.warn(`⚠️ Blocked localhost/internal address: ${hostname}`);
      return false;
    }
    
    // Block private IP ranges (RFC 1918)
    if (isPrivateIP(hostname)) {
      console.warn(`⚠️ Blocked private IP: ${hostname}`);
      return false;
    }
    
    // Whitelist government and approved domains
    const allowedDomains = [
      '.gov',           // Federal/state government
      '.state.us',      // State government
      '.ca.us',         // California
      '.ny.us',         // New York
      '.tx.us',         // Texas
      '.fl.us',         // Florida
      'legistar.com',   // Legistar API
      'openstates.org', // OpenStates
      'congress.gov'    // Congress.gov
    ];
    
    const isWhitelisted = allowedDomains.some(domain => {
      if (domain.startsWith('.')) {
        return hostname.endsWith(domain) || hostname === domain.slice(1);
      }
      return hostname === domain || hostname.endsWith('.' + domain);
    });
    
    if (!isWhitelisted) {
      console.warn(`⚠️ Domain not whitelisted: ${hostname}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Invalid URL: ${url}`, error);
    return false;
  }
}

/**
 * Check if hostname is a private IP address
 */
function isPrivateIP(hostname: string): boolean {
  // Check for IPv4 private ranges
  const ipv4Patterns = [
    /^10\./,                    // 10.0.0.0/8
    /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
    /^192\.168\./               // 192.168.0.0/16
  ];
  
  return ipv4Patterns.some(pattern => pattern.test(hostname));
}

/**
 * Validate multiple URLs at once
 */
export function validateScraperUrls(urls: string[]): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];
  
  for (const url of urls) {
    if (isAllowedScraperUrl(url)) {
      valid.push(url);
    } else {
      invalid.push(url);
    }
  }
  
  return { valid, invalid };
}

/**
 * Sanitize URL for logging (remove sensitive query params)
 */
export function sanitizeUrlForLog(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove common sensitive params
    ['key', 'token', 'api_key', 'apikey', 'secret', 'password'].forEach(param => {
      if (parsed.searchParams.has(param)) {
        parsed.searchParams.set(param, '***REDACTED***');
      }
    });
    return parsed.toString();
  } catch {
    return url;
  }
}
