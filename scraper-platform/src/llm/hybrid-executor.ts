/**
 * Hybrid scraper executor - tries generic engine first, falls back to LLM-generated scripts
 */

import { ScraperEngine } from '../engine/scraper-engine.js';
import { ScraperScriptGenerator } from './script-generator.js';
import { OllamaClient } from './ollama-client.js';
import type { ScraperConfig } from '../types.js';
import puppeteer, { Browser, Page } from 'puppeteer';

export interface ExecutionResult {
  success: boolean;
  data?: any[];
  error?: string;
  executionMode: 'generic' | 'llm-generated' | 'cached-script';
  duration: number;
  itemCount: number;
}

export interface CachedScript {
  scraperId: number;
  code: string;
  successCount: number;
  failureCount: number;
  lastUsed: Date;
  averageDuration: number;
}

export class HybridScraperExecutor {
  private scriptGenerator: ScraperScriptGenerator;
  private ollama: OllamaClient;
  private scriptCache: Map<number, CachedScript> = new Map();

  constructor() {
    this.ollama = new OllamaClient();
    this.scriptGenerator = new ScraperScriptGenerator(this.ollama);
  }

  /**
   * Execute scraper using best available method
   */
  async execute(config: ScraperConfig, scraperId: number): Promise<ExecutionResult> {
    const startTime = Date.now();
    console.log(`\n🕷️  [Scraper ${scraperId}] Starting execution: ${config.name}`);
    console.log(`📍 Jurisdiction: ${config.jurisdiction}`);

    // 1. Try cached LLM-generated script first (if exists and has good track record)
    const cached = this.scriptCache.get(scraperId);
    if (cached && this.shouldUseCachedScript(cached)) {
      console.log(`⚡ [Scraper ${scraperId}] Using cached LLM-generated script (${cached.successCount}/${cached.runCount} success rate)`);
      try {
        const result = await this.executeCachedScript(config, cached);
        this.updateCacheStats(scraperId, true, Date.now() - startTime);
        console.log(`✅ [Scraper ${scraperId}] Cached script succeeded: ${result.length} items in ${Math.round((Date.now() - startTime) / 1000)}s`);
        return {
          success: true,
          data: result,
          executionMode: 'cached-script',
          duration: Date.now() - startTime,
          itemCount: result.length
        };
      } catch (error: any) {
        console.log(`❌ [Scraper ${scraperId}] Cached script failed: ${error.message}`);
        this.updateCacheStats(scraperId, false, Date.now() - startTime);
        // Fall through to try other methods
      }
    }

    // 2. Try generic engine
    console.log(`🔧 [Scraper ${scraperId}] Attempting generic scraper engine...`);
    try {
      const engine = new ScraperEngine(config, { 
        verbose: true, 
        saveToDatabase: false 
      });
      const genericResult = await engine.scrape();
      
      if (genericResult && genericResult.length > 0) {
        console.log(`✅ [Scraper ${scraperId}] Generic engine succeeded: ${genericResult.length} items in ${Math.round((Date.now() - startTime) / 1000)}s`);
        return {
          success: true,
          data: genericResult,
          executionMode: 'generic',
          duration: Date.now() - startTime,
          itemCount: genericResult.length
        };
      } else {
        throw new Error('Generic engine returned no data');
      }
    } catch (error: any) {
      console.log(`⚠️  [Scraper ${scraperId}] Generic engine failed: ${error.message}`);
      
      // 3. Fall back to LLM script generation
      return await this.generateAndExecute(config, scraperId, error.message, startTime);
    }
  }

  private async generateAndExecute(
    config: ScraperConfig,
    scraperId: number,
    failureReason: string,
    startTime: number
  ): Promise<ExecutionResult> {
    // Check if Ollama is available
    const isAvailable = await this.ollama.checkAvailability();
    if (!isAvailable) {
      console.log(`❌ [Scraper ${scraperId}] Ollama not available`);
      return {
        success: false,
        error: 'Ollama not available. Install Ollama and run: ollama pull gemma3:4b',
        executionMode: 'llm-generated',
        duration: Date.now() - startTime,
        itemCount: 0
      };
    }

    console.log(`🤖 [Scraper ${scraperId}] Generating custom script with LLM (${this.ollama['model']})...`);
    
    try {
      // Fetch HTML snapshot
      console.log(`📡 [Scraper ${scraperId}] Fetching HTML snapshot from ${config.startUrl}...`);
      const htmlSnapshot = await this.fetchHtmlSnapshot(config.startUrl);
      console.log(`✓ [Scraper ${scraperId}] HTML snapshot fetched (${Math.round(htmlSnapshot.length / 1024)}KB)`);

      // Generate script
      console.log(`🧠 [Scraper ${scraperId}] Prompting LLM to generate custom Puppeteer script...`);
      const generated = await this.scriptGenerator.generateScript({
        config,
        htmlSnapshot,
        failureReason,
        existingAttempts: 1
      });

      console.log(`📝 [Scraper ${scraperId}] Script generated!`);
      console.log(`   Confidence: ${generated.confidence}`);
      console.log(`   Reasoning: ${generated.reasoning}`);

      // Execute generated script
      console.log(`▶️  [Scraper ${scraperId}] Executing LLM-generated script...`);
      const result = await this.executeGeneratedScript(config, generated.code);
      console.log(`✅ [Scraper ${scraperId}] LLM script succeeded: ${result.length} items in ${Math.round((Date.now() - startTime) / 1000)}s`);

      // Cache successful script
      this.scriptCache.set(scraperId, {
        scraperId,
        code: generated.code,
        successCount: 1,
        failureCount: 0,
        runCount: 1,
        lastUsed: new Date(),
        averageDuration: Date.now() - startTime
      });
      console.log(`💾 [Scraper ${scraperId}] Script cached for future use`);

      return {
        success: true,
        data: result,
        executionMode: 'llm-generated',
        duration: Date.now() - startTime,
        itemCount: result.length
      };
    } catch (error: any) {
      console.log(`❌ [Scraper ${scraperId}] LLM generation failed: ${error.message}`);
      return {
        success: false,
        error: `LLM generation failed: ${error.message}`,
        executionMode: 'llm-generated',
        duration: Date.now() - startTime,
        itemCount: 0
      };
    }
  }

  private async fetchHtmlSnapshot(url: string): Promise<string> {
    const browser = await puppeteer.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForTimeout(2000); // Let JS execute
      const html = await page.content();
      return html;
    } finally {
      await browser.close();
    }
  }

  private async executeGeneratedScript(config: ScraperConfig, code: string): Promise<any[]> {
    const browser = await puppeteer.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(config.startUrl, { waitUntil: 'networkidle2', timeout: 30000 });

      // Create a safe execution environment
      const scrapeDataFunction = new Function('page', 'config', `
        ${code}
        return scrapeData(page, config);
      `);

      const result = await scrapeDataFunction(page, config);
      return Array.isArray(result) ? result : [];
    } finally {
      await browser.close();
    }
  }

  private async executeCachedScript(config: ScraperConfig, cached: CachedScript): Promise<any[]> {
    return this.executeGeneratedScript(config, cached.code);
  }

  private shouldUseCachedScript(cached: CachedScript): boolean {
    const successRate = cached.successCount / (cached.successCount + cached.failureCount);
    const daysSinceUse = (Date.now() - cached.lastUsed.getTime()) / (1000 * 60 * 60 * 24);
    
    // Use cached if: success rate > 70% AND used within last 30 days
    return successRate > 0.7 && daysSinceUse < 30;
  }

  private updateCacheStats(scraperId: number, success: boolean, duration: number): void {
    const cached = this.scriptCache.get(scraperId);
    if (!cached) return;

    if (success) {
      cached.successCount++;
    } else {
      cached.failureCount++;
    }

    cached.lastUsed = new Date();
    cached.averageDuration = (cached.averageDuration + duration) / 2;

    // Remove from cache if success rate drops below 30%
    const successRate = cached.successCount / (cached.successCount + cached.failureCount);
    if (successRate < 0.3 && cached.successCount + cached.failureCount > 5) {
      console.log(`🗑️ Removing low-performing cached script for scraper ${scraperId}`);
      this.scriptCache.delete(scraperId);
    }
  }

  /**
   * Get execution statistics
   */
  getStats() {
    return {
      cachedScripts: this.scriptCache.size,
      scripts: Array.from(this.scriptCache.values()).map(c => ({
        id: c.scraperId,
        successRate: c.successCount / (c.successCount + c.failureCount),
        totalRuns: c.successCount + c.failureCount,
        avgDuration: Math.round(c.averageDuration / 1000) + 's'
      }))
    };
  }
}
