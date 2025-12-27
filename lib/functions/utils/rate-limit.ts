/**
 * Rate Limiting Middleware for Netlify Functions
 * Prevents API abuse and resource exhaustion
 */

interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window per identifier
  identifyUser?: (event: any) => string;
  onRateLimit?: (event: any) => any;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store (in production, use Redis or similar)
const rateLimitStore: RateLimitStore = {};

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach(key => {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key];
    }
  });
}, 5 * 60 * 1000);

/**
 * Rate limit a Netlify Function handler
 */
export function rateLimit(config: RateLimitConfig, handler: any) {
  const {
    windowMs,
    maxRequests,
    identifyUser = (event) => {
      const ip = event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown';
      const ua = (event.headers['user-agent'] || 'unknown').slice(0, 50);
      return `${ip}:${ua}`;
    },
    onRateLimit = (event) => ({
      statusCode: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.ceil(windowMs / 1000))
      },
      body: JSON.stringify({ 
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      })
    })
  } = config;

  return async (event: any, context: any) => {
    const identifier = identifyUser(event);
    const now = Date.now();
    
    // Initialize or get rate limit data
    if (!rateLimitStore[identifier] || rateLimitStore[identifier].resetTime < now) {
      rateLimitStore[identifier] = {
        count: 0,
        resetTime: now + windowMs
      };
    }
    
    // Increment count
    rateLimitStore[identifier].count++;
    
    // Check if limit exceeded
    if (rateLimitStore[identifier].count > maxRequests) {
      console.warn(`⚠️ Rate limit exceeded for ${identifier} (${rateLimitStore[identifier].count} requests)`);
      return onRateLimit(event);
    }
    
    // Add rate limit headers
    const response = await handler(event, context);
    const remaining = Math.max(0, maxRequests - rateLimitStore[identifier].count);
    const resetTime = Math.ceil(rateLimitStore[identifier].resetTime / 1000);
    
    return {
      ...response,
      headers: {
        ...response.headers,
        'X-RateLimit-Limit': String(maxRequests),
        'X-RateLimit-Remaining': String(remaining),
        'X-RateLimit-Reset': String(resetTime)
      }
    };
  };
}

/**
 * Simple rate limiter for inline use
 */
export function checkRateLimit(
  identifier: string, 
  maxRequests: number = 30, 
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  
  if (!rateLimitStore[identifier] || rateLimitStore[identifier].resetTime < now) {
    rateLimitStore[identifier] = {
      count: 1,
      resetTime: now + windowMs
    };
    return { allowed: true, remaining: maxRequests - 1, resetTime: rateLimitStore[identifier].resetTime };
  }
  
  rateLimitStore[identifier].count++;
  const remaining = Math.max(0, maxRequests - rateLimitStore[identifier].count);
  const allowed = rateLimitStore[identifier].count <= maxRequests;
  
  return { allowed, remaining, resetTime: rateLimitStore[identifier].resetTime };
}
