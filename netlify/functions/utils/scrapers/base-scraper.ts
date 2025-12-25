/**
 * BaseScraper - Abstract base class for all state legislative scrapers
 * 
 * Provides:
 * - Structured logging with prefixes
 * - Error handling and retries
 * - HTTP utilities with timeout
 * - Rate limiting
 * - Cache integration
 * - Health tracking
 * - XSS protection via sanitization
 */

import { LegislativeEvent } from '../../../../src/types/event';
import { sanitizeEvent } from '../security';
import { autoTagEvent } from '../tagging';

export interface ScraperConfig {
  stateCode: string;
  stateName: string;
  websiteUrl: string;
  
  // Reliability metadata
  reliability: 'high' | 'medium' | 'low';
  updateFrequency: number; // Hours between scrapes
  
  // Rate limiting
  maxRequestsPerMinute?: number;
  requestDelay?: number; // Milliseconds between requests
}

export interface RawEvent {
  name: string;
  date: string | Date;
  time?: string;
  location?: string;
  committee?: string;
  type?: string;
  description?: string;
  detailsUrl?: string;
  
  // 🆕 Docket & Virtual Meeting Fields
  docketUrl?: string;
  virtualMeetingUrl?: string;
  bills?: BillInfo[];
  tags?: string[];
  sourceUrl?: string;  // URL of the page where data was scraped from
  allowsPublicParticipation?: boolean;  // Whether public comment/testimony is allowed
  externalId?: string;  // External ID for deduplication (e.g., from OpenStates API)
}

// 🆕 Bill information for raw events
export interface BillInfo {
  id: string;
  title: string;
  url: string;
  status?: string;
  sponsors?: string[];
  tags?: string[];
}

export interface ScraperHealth {
  stateCode: string;
  enabled: boolean;
  lastAttempt: Date | null;
  lastSuccess: Date | null;
  consecutiveFailures: number;
  lastError: string | null;
  eventsScraped: number;
}

/**
 * Abstract base class that all state scrapers must extend
 */
export abstract class BaseScraper {
  protected config: ScraperConfig;
  protected health: ScraperHealth;
  private requestCount: number = 0;
  private requestWindowStart: number = Date.now();

  constructor(config: ScraperConfig) {
    this.config = config;
    this.health = {
      stateCode: config.stateCode,
      enabled: true,
      lastAttempt: null,
      lastSuccess: null,
      consecutiveFailures: 0,
      lastError: null,
      eventsScraped: 0
    };
    
    this.log('🏗️ Scraper initialized', {
      state: config.stateCode,
      website: config.websiteUrl,
      reliability: config.reliability
    });
  }

  /**
   * Get consistent scraper name for database operations
   */
  get name(): string {
    return `scraper-${this.config.stateCode.toLowerCase()}`;
  }

  /**
   * Main entry point - scrapes events and updates health
   */
  async scrape(): Promise<LegislativeEvent[]> {
    const startTime = Date.now();
    this.health.lastAttempt = new Date();
    
    this.log('🚀 Starting scrape', {
      state: this.config.stateCode,
      enabled: this.health.enabled,
      lastSuccess: this.health.lastSuccess
    });

    if (!this.health.enabled) {
      this.log('⚠️ Scraper disabled, skipping', {
        reason: 'Too many consecutive failures',
        lastError: this.health.lastError
      });
      return [];
    }

    try {
      // Call abstract method that each state implements
      const rawEvents = await this.scrapeCalendar();
      
      this.log('📦 Raw events scraped', {
        count: rawEvents.length,
        sample: rawEvents[0]?.name || 'none'
      });

      // Transform raw events to standard format
      const events = await this.transformEvents(rawEvents);
      
      this.log('✅ Scrape successful', {
        state: this.config.stateCode,
        eventsFound: events.length,
        duration: `${Date.now() - startTime}ms`
      });

      // Update health tracking
      this.health.lastSuccess = new Date();
      this.health.consecutiveFailures = 0;
      this.health.lastError = null;
      this.health.eventsScraped = events.length;

      return events;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.logError('❌ Scrape failed', error, {
        state: this.config.stateCode,
        duration: `${Date.now() - startTime}ms`
      });

      // Update health tracking
      this.health.consecutiveFailures++;
      this.health.lastError = errorMessage;

      // Disable scraper after 3 consecutive failures
      if (this.health.consecutiveFailures >= 3) {
        this.health.enabled = false;
        this.log('🚫 Scraper auto-disabled', {
          state: this.config.stateCode,
          failures: this.health.consecutiveFailures,
          error: errorMessage
        });
      }

      throw error;
    }
  }

  /**
   * Abstract method that each state must implement
   * Returns raw, unprocessed events from the state website
   */
  protected abstract scrapeCalendar(): Promise<RawEvent[]>;

  /**
   * Optional: Get calendar source URLs that this scraper uses
   * This helps users understand where the data comes from
   * Override this in state scrapers to return actual calendar URLs
   */
  getCalendarSources(): { name: string; url: string; description: string }[] {
    return [
      {
        name: `${this.config.stateName} Legislature`,
        url: this.config.websiteUrl,
        description: 'State legislative calendar'
      }
    ];
  }

  /**
   * Optional: Get multiple page URLs to scrape (for multi-page states)
   */
  protected async getPageUrls(): Promise<string[]> {
    return [this.config.websiteUrl];
  }

  /**
   * Transform raw events to standardized format
   */
  protected async transformEvents(rawEvents: RawEvent[]): Promise<LegislativeEvent[]> {
    this.log('🔄 Transforming events', { count: rawEvents.length });

    const events: LegislativeEvent[] = [];

    for (const raw of rawEvents) {
      try {
        const event = await this.transformEvent(raw);
        if (event) {
          events.push(event);
        }
      } catch (error) {
        this.logError('⚠️ Failed to transform event', error, {
          eventName: raw.name,
          eventDate: raw.date
        });
        // Continue processing other events
      }
    }

    return events;
  }

  /**
   * Transform single raw event to standard format
   */
  protected async transformEvent(raw: RawEvent): Promise<LegislativeEvent | null> {
    try {
      const date = raw.date instanceof Date ? raw.date : new Date(raw.date);
      
      // Skip past events
      if (date < new Date()) {
        this.log('⏭️ Skipping past event', {
          name: raw.name,
          date: date.toISOString()
        });
        return null;
      }

      return sanitizeEvent({
        id: this.generateEventId(raw),
        name: raw.name,
        date: date.toISOString(),
        time: raw.time || date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
        location: raw.location || `${this.config.stateName} State Capitol`,
        committee: raw.committee || 'Legislature',
        type: raw.type || 'meeting',
        level: 'state',
        state: this.config.stateCode,
        lat: 0, // Will be set by geocoder
        lng: 0,
        zipCode: null,
        description: raw.description || null,
        url: raw.detailsUrl || null,
        docketUrl: raw.docketUrl || null,
        virtualMeetingUrl: raw.virtualMeetingUrl || null,
        bills: raw.bills || null,
        tags: raw.tags && raw.tags.length > 0 ? raw.tags : autoTagEvent({
          name: raw.name,
          description: raw.description,
          committee: raw.committee,
          location: raw.location
        }),
        sourceUrl: raw.sourceUrl || this.config.websiteUrl,
        allowsPublicParticipation: raw.allowsPublicParticipation !== undefined 
          ? raw.allowsPublicParticipation 
          : this.detectPublicParticipation(raw)
      }) as LegislativeEvent;

    } catch (error) {
      this.logError('⚠️ Event transformation error', error, { raw });
      return null;
    }
  }

  /**
   * Detect if event allows public participation based on content
   */
  protected detectPublicParticipation(raw: RawEvent): boolean {
    const searchText = [
      raw.name || '',
      raw.description || '',
      raw.type || ''
    ].join(' ').toLowerCase();

    const publicParticipationKeywords = [
      'public comment',
      'public participation',
      'public testimony',
      'public hearing',
      'citizen input',
      'community input',
      'public input',
      'public meeting',
      'open to public',
      'public invited',
      'public attendance',
      'town hall',
      'public forum'
    ];

    return publicParticipationKeywords.some(keyword => 
      searchText.includes(keyword)
    );
  }

  /**
   * Generate unique event ID
   */
  protected generateEventId(raw: RawEvent): string {
    const date = raw.date instanceof Date ? raw.date : new Date(raw.date);
    const dateStr = date.toISOString().split('T')[0];
    // Use name if available, fallback to committee, then timestamp
    const nameSource = raw.name || raw.committee || `event-${date.getTime()}`;
    const nameSlug = nameSource.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50);
    const stateCode = this.config?.stateCode || 'unknown';
    return `${stateCode.toLowerCase()}-${dateStr}-${nameSlug}`;
  }

  /**
   * HTTP fetch with timeout, retries, and rate limiting
   */
  protected async fetchPage(url: string, options: RequestInit = {}): Promise<string> {
    await this.rateLimit();

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.log('🌐 Fetching page', {
          url,
          attempt,
          maxRetries
        });

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'User-Agent': 'Civitron/1.0 (Legislative Events Aggregator)',
            ...options.headers
          }
        });

        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();
        
        this.log('✅ Page fetched', {
          url,
          size: `${Math.round(html.length / 1024)}KB`,
          status: response.status
        });

        return html;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        this.logError('⚠️ Fetch failed', error, {
          url,
          attempt,
          maxRetries,
          willRetry: attempt < maxRetries
        });

        if (attempt < maxRetries) {
          await this.sleep(1000 * attempt); // Exponential backoff
        }
      }
    }

    throw lastError || new Error('Fetch failed after retries');
  }

  /**
   * Rate limiting to avoid being blocked
   */
  protected async rateLimit(): Promise<void> {
    const maxRequests = this.config.maxRequestsPerMinute || 30;
    const windowMs = 60000; // 1 minute

    // Reset window if needed
    if (Date.now() - this.requestWindowStart > windowMs) {
      this.requestCount = 0;
      this.requestWindowStart = Date.now();
    }

    // Check if we need to wait
    if (this.requestCount >= maxRequests) {
      const waitTime = windowMs - (Date.now() - this.requestWindowStart);
      this.log('⏳ Rate limit reached, waiting', {
        waitTime: `${Math.round(waitTime / 1000)}s`,
        requests: this.requestCount
      });
      await this.sleep(waitTime);
      this.requestCount = 0;
      this.requestWindowStart = Date.now();
    }

    this.requestCount++;

    // Optional: Add delay between requests
    if (this.config.requestDelay) {
      await this.sleep(this.config.requestDelay);
    }
  }

  /**
   * Resolve relative URLs to absolute
   */
  protected resolveUrl(relativeUrl: string | undefined): string | undefined {
    if (!relativeUrl) return undefined;
    
    try {
      return new URL(relativeUrl, this.config.websiteUrl).href;
    } catch {
      return relativeUrl;
    }
  }

  /**
   * Sleep utility
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Structured logging with state prefix
   */
  protected log(message: string, data?: any): void {
    const prefix = `[SCRAPER:${this.config.stateCode}]`;
    if (data) {
      console.log(prefix, message, JSON.stringify(data, null, 2));
    } else {
      console.log(prefix, message);
    }
  }

  /**
   * Error logging with stack traces
   */
  protected logError(message: string, error: unknown, data?: any): void {
    const prefix = `[SCRAPER:${this.config.stateCode}]`;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    
    console.error(prefix, message, {
      error: errorMessage,
      stack: stack?.split('\n').slice(0, 3).join('\n'), // First 3 lines of stack
      ...data
    });
  }

  /**
   * Get scraper health status
   */
  getHealth(): ScraperHealth {
    return { ...this.health };
  }

  /**
   * Manually enable/disable scraper
   */
  setEnabled(enabled: boolean): void {
    this.health.enabled = enabled;
    this.log(`🔧 Scraper ${enabled ? 'enabled' : 'disabled'}`, {
      manual: true
    });
  }

  /**
   * Reset health tracking (useful after fixing a broken scraper)
   */
  resetHealth(): void {
    this.health.consecutiveFailures = 0;
    this.health.lastError = null;
    this.health.enabled = true;
    this.log('🔄 Health reset', { state: this.config.stateCode });
  }
}
