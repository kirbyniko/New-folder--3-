/**
 * ScraperRegistry - Central registry for managing all state scrapers
 * 
 * Features:
 * - Register/retrieve scrapers by state code
 * - Health monitoring across all scrapers
 * - Enable/disable scrapers dynamically
 * - Get aggregate statistics
 */

import { BaseScraper, ScraperHealth } from './base-scraper';

export interface RegistryStats {
  totalScrapers: number;
  enabledScrapers: number;
  disabledScrapers: number;
  recentSuccesses: number;
  recentFailures: number;
  coverageByState: Record<string, ScraperHealth>;
}

class ScraperRegistryClass {
  private scrapers: Map<string, BaseScraper> = new Map();
  private initialized: boolean = false;

  /**
   * Register a scraper for a state
   */
  register(stateCode: string, scraper: BaseScraper): void {
    const normalizedCode = stateCode.toUpperCase();
    
    if (this.scrapers.has(normalizedCode)) {
      console.warn(`[REGISTRY] ⚠️ Overwriting existing scraper for ${normalizedCode}`);
    }
    
    this.scrapers.set(normalizedCode, scraper);
    
    console.log(`[REGISTRY] ✅ Registered scraper`, {
      state: normalizedCode,
      totalScrapers: this.scrapers.size
    });
  }

  /**
   * Get scraper for a state (returns undefined if not registered)
   */
  get(stateCode: string): BaseScraper | undefined {
    const normalizedCode = stateCode.toUpperCase();
    return this.scrapers.get(normalizedCode);
  }

  /**
   * Check if a scraper exists for a state
   */
  has(stateCode: string): boolean {
    return this.scrapers.has(stateCode.toUpperCase());
  }

  /**
   * Get all registered state codes
   */
  getRegisteredStates(): string[] {
    return Array.from(this.scrapers.keys()).sort();
  }

  /**
   * Get all scrapers
   */
  getAll(): BaseScraper[] {
    return Array.from(this.scrapers.values());
  }

  /**
   * Get only enabled scrapers
   */
  getEnabled(): BaseScraper[] {
    return this.getAll().filter(scraper => scraper.getHealth().enabled);
  }

  /**
   * Get health status for all scrapers
   */
  getAllHealth(): Record<string, ScraperHealth> {
    const health: Record<string, ScraperHealth> = {};
    
    const scraperEntries = Array.from(this.scrapers.entries());
    for (const [stateCode, scraper] of scraperEntries) {
      health[stateCode] = scraper.getHealth();
    }
    
    return health;
  }

  /**
   * Get aggregate statistics
   */
  getStats(): RegistryStats {
    const allHealth = this.getAllHealth();
    const healthArray = Object.values(allHealth);
    
    // Count successes/failures in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentSuccesses = healthArray.filter(h => 
      h.lastSuccess && new Date(h.lastSuccess) > oneDayAgo
    ).length;
    
    const recentFailures = healthArray.filter(h => 
      h.lastAttempt && new Date(h.lastAttempt) > oneDayAgo && 
      h.consecutiveFailures > 0
    ).length;

    const stats: RegistryStats = {
      totalScrapers: this.scrapers.size,
      enabledScrapers: healthArray.filter(h => h.enabled).length,
      disabledScrapers: healthArray.filter(h => !h.enabled).length,
      recentSuccesses,
      recentFailures,
      coverageByState: allHealth
    };

    return stats;
  }

  /**
   * Enable a scraper by state code
   */
  enable(stateCode: string): boolean {
    const scraper = this.get(stateCode);
    if (!scraper) {
      console.warn(`[REGISTRY] ⚠️ Cannot enable - scraper not found: ${stateCode}`);
      return false;
    }
    
    scraper.setEnabled(true);
    console.log(`[REGISTRY] ✅ Enabled scraper: ${stateCode}`);
    return true;
  }

  /**
   * Disable a scraper by state code
   */
  disable(stateCode: string): boolean {
    const scraper = this.get(stateCode);
    if (!scraper) {
      console.warn(`[REGISTRY] ⚠️ Cannot disable - scraper not found: ${stateCode}`);
      return false;
    }
    
    scraper.setEnabled(false);
    console.log(`[REGISTRY] 🚫 Disabled scraper: ${stateCode}`);
    return true;
  }

  /**
   * Reset health for a scraper (useful after fixing it)
   */
  resetHealth(stateCode: string): boolean {
    const scraper = this.get(stateCode);
    if (!scraper) {
      console.warn(`[REGISTRY] ⚠️ Cannot reset - scraper not found: ${stateCode}`);
      return false;
    }
    
    scraper.resetHealth();
    console.log(`[REGISTRY] 🔄 Reset health: ${stateCode}`);
    return true;
  }

  /**
   * Log comprehensive registry status
   */
  logStatus(): void {
    const stats = this.getStats();
    
    console.log('[REGISTRY] 📊 Registry Status', {
      totalScrapers: stats.totalScrapers,
      enabled: stats.enabledScrapers,
      disabled: stats.disabledScrapers,
      recentSuccesses: stats.recentSuccesses,
      recentFailures: stats.recentFailures,
      registeredStates: this.getRegisteredStates()
    });

    // Log details about disabled scrapers
    const disabledStates = Object.entries(stats.coverageByState)
      .filter(([_, health]) => !health.enabled)
      .map(([state, health]) => ({
        state,
        failures: health.consecutiveFailures,
        error: health.lastError
      }));

    if (disabledStates.length > 0) {
      console.warn('[REGISTRY] ⚠️ Disabled scrapers', disabledStates);
    }
  }

  /**
   * Initialize scrapers (called once to load all state scrapers)
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[REGISTRY] ⏭️ Already initialized, skipping');
      return;
    }

    console.log('[REGISTRY] 🚀 Initializing scrapers...');

    // TODO: Import and register all state scrapers here
    // For now, this will be populated as we build each scraper
    // Example:
    // import { NewHampshireScraper } from './states/new-hampshire';
    // this.register('NH', new NewHampshireScraper());

    this.initialized = true;
    
    console.log('[REGISTRY] ✅ Initialization complete', {
      scrapersRegistered: this.scrapers.size
    });
  }

  /**
   * Health check for all scrapers (useful for monitoring)
   */
  async healthCheck(): Promise<RegistryStats> {
    console.log('[REGISTRY] 🏥 Running health check on all scrapers...');
    
    const promises = this.getEnabled().map(async (scraper) => {
      const stateCode = scraper.getHealth().stateCode;
      try {
        // Quick validation scrape (could be cached)
        await scraper.scrape();
        console.log(`[REGISTRY] ✅ Health check passed: ${stateCode}`);
      } catch (error) {
        console.error(`[REGISTRY] ❌ Health check failed: ${stateCode}`, error);
      }
    });

    await Promise.allSettled(promises);
    
    const stats = this.getStats();
    console.log('[REGISTRY] 🏥 Health check complete', {
      enabled: stats.enabledScrapers,
      disabled: stats.disabledScrapers
    });

    return stats;
  }

  /**
   * Clear all scrapers (useful for testing)
   */
  clear(): void {
    this.scrapers.clear();
    this.initialized = false;
    console.log('[REGISTRY] 🗑️ Cleared all scrapers');
  }
}

// Export singleton instance
export const ScraperRegistry = new ScraperRegistryClass();
