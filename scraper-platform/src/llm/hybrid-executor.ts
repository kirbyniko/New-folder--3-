/**
 * Hybrid scraper executor - tries generic engine first, falls back to LLM-generated scripts
 */

import { ScraperEngine } from '../engine/scraper-engine.js';
import { ScraperScriptGenerator } from './script-generator.js';
import { OllamaClient } from './ollama-client.js';
import type { ScraperConfig } from '../types.js';
import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';

// Lazy-loaded broadcast function
let broadcastLog: ((scraperId: number, level: string, message: string) => void) | null = null;
let broadcastInitialized = false;

async function initBroadcast() {
  if (!broadcastInitialized) {
    broadcastInitialized = true;
    try {
      const serverModule = await import('../server.js');
      broadcastLog = serverModule.broadcastLog;
    } catch {}
  }
}

function log(scraperId: number, level: string, message: string) {
  const timestamp = new Date().toLocaleTimeString();
  
  // Store in execution history for this scraper
  if (!executionLogs.has(scraperId)) {
    executionLogs.set(scraperId, []);
  }
  executionLogs.get(scraperId)!.push({ timestamp, level, message });
  
  // Broadcast to SSE clients
  if (broadcastLog) {
    broadcastLog(scraperId, level, message);
  } else {
    const emoji = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' }[level] || '📝';
    console.log(`${emoji} [Scraper ${scraperId}] ${message}`);
  }
}

// Global execution logs storage
const executionLogs = new Map<number, Array<{ timestamp: string; level: string; message: string }>>();

export function getExecutionLogs(scraperId: number): Array<{ timestamp: string; level: string; message: string }> {
  return executionLogs.get(scraperId) || [];
}

export function clearExecutionLogs(scraperId: number): void {
  executionLogs.delete(scraperId);
}

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

export interface ExecutionDetails {
  scraperId: number;
  scraperName: string;
  executionMode?: string;
  itemCount?: number;
  duration?: number;
  generatedScript?: {
    code: string;
    confidence: string;
    reasoning: string;
  };
  htmlSnapshot?: string;
  logs: Array<{ timestamp: string; level: string; message: string }>;
  scrapedData?: any[];
}

export class HybridScraperExecutor {
  private scriptGenerator: ScraperScriptGenerator;
  private ollama: OllamaClient;
  private scriptCache: Map<number, CachedScript> = new Map();
  private executionHistory: Map<number, ExecutionDetails> = new Map();

  constructor() {
    this.ollama = new OllamaClient();
    this.scriptGenerator = new ScraperScriptGenerator(this.ollama);
  }

  /**
   * Get execution details for a scraper
   */
  getExecutionDetails(scraperId: number): ExecutionDetails | undefined {
    return this.executionHistory.get(scraperId);
  }

  /**
   * Store execution details
   */
  private storeExecutionDetails(details: ExecutionDetails) {
    this.executionHistory.set(details.scraperId, details);
  }

  /**
   * Execute scraper using best available method
   */
  async execute(config: ScraperConfig, scraperId: number): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    // Initialize broadcast on first execution
    await initBroadcast();
    
    // Clear old logs for this scraper
    clearExecutionLogs(scraperId);
    
    log(scraperId, 'info', `Starting execution: ${config.name}`);
    log(scraperId, 'info', `Jurisdiction: ${config.jurisdiction}`);

    // 1. Try cached LLM-generated script first (if exists and has good track record)
    const cached = this.scriptCache.get(scraperId);
    if (cached && this.shouldUseCachedScript(cached)) {
      log(scraperId, 'info', `Using cached LLM-generated script (${cached.successCount}/${cached.runCount} success rate)`);
      try {
        const result = await this.executeCachedScript(config, cached);
        this.updateCacheStats(scraperId, true, Date.now() - startTime);
        log(scraperId, 'success', `Cached script succeeded: ${result.length} items in ${Math.round((Date.now() - startTime) / 1000)}s`);
        
        // Store execution details for cached script
        this.storeExecutionDetails({
          scraperId,
          scraperName: config.name,
          executionMode: 'cached-script',
          itemCount: result.length,
          duration: Date.now() - startTime,
          generatedScript: {
            code: cached.code,
            confidence: 'cached',
            reasoning: `Cached script - ${cached.successCount}/${cached.runCount} success rate`
          },
          logs: getExecutionLogs(scraperId),
          scrapedData: result
        });
        
        return {
          success: true,
          data: result,
          executionMode: 'cached-script',
          duration: Date.now() - startTime,
          itemCount: result.length
        };
      } catch (error: any) {
        log(scraperId, 'error', `Cached script failed: ${error.message}`);
        this.updateCacheStats(scraperId, false, Date.now() - startTime);
        // Fall through to try other methods
      }
    }

    // 2. Try generic engine
    log(scraperId, 'info', 'Attempting generic scraper engine...');
    try {
      const engine = new ScraperEngine(config, { 
        verbose: true, 
        saveToDatabase: false 
      });
      const genericResult = await engine.scrape();
      
      if (genericResult && genericResult.length > 0) {
        log(scraperId, 'success', `Generic engine succeeded: ${genericResult.length} items in ${Math.round((Date.now() - startTime) / 1000)}s`);
        
        // Store execution details for generic engine
        this.storeExecutionDetails({
          scraperId,
          scraperName: config.name,
          executionMode: 'generic',
          itemCount: genericResult.length,
          duration: Date.now() - startTime,
          logs: getExecutionLogs(scraperId),
          scrapedData: genericResult
        });
        
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
      log(scraperId, 'warning', `Generic engine failed: ${error.message}`);
      
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
      log(scraperId, 'error', 'Ollama not available');
      return {
        success: false,
        error: 'Ollama not available. Install Ollama and run: ollama pull gemma3:4b',
        executionMode: 'llm-generated',
        duration: Date.now() - startTime,
        itemCount: 0
      };
    }

    log(scraperId, 'info', `Generating custom script with LLM (${this.ollama['model']})...`);
    
    let htmlSnapshot = '';
    let generatedCode = '';
    let generatedConfidence = '';
    let generatedReasoning = '';
    
    try {
      // Fetch HTML snapshot
      log(scraperId, 'info', `Fetching HTML snapshot from ${config.startUrl}...`);
      htmlSnapshot = await this.fetchHtmlSnapshot(config.startUrl);
      log(scraperId, 'info', `HTML snapshot fetched (${Math.round(htmlSnapshot.length / 1024)}KB)`);

      // Generate script
      log(scraperId, 'info', 'Prompting LLM to generate custom Puppeteer script...');
      const generated = await this.scriptGenerator.generateScript({
        config,
        htmlSnapshot,
        failureReason,
        existingAttempts: 1
      });

      generatedCode = generated.code;
      generatedConfidence = generated.confidence;
      generatedReasoning = generated.reasoning;

      log(scraperId, 'success', `Script generated! Confidence: ${generated.confidence}`);
      log(scraperId, 'info', `Reasoning: ${generated.reasoning}`);

      // Execute generated script
      log(scraperId, 'info', 'Executing LLM-generated script...');
      const result = await this.executeGeneratedScript(config, generated.code);
      const resultCount = result?.length || 0;
      log(scraperId, 'success', `LLM script succeeded: ${resultCount} items in ${Math.round((Date.now() - startTime) / 1000)}s`);

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
      log(scraperId, 'info', 'Script cached for future use');

      // Store execution details with captured logs
      this.storeExecutionDetails({
        scraperId,
        scraperName: config.name,
        executionMode: 'llm-generated',
        itemCount: resultCount,
        duration: Date.now() - startTime,
        generatedScript: {
          code: generated.code,
          confidence: generated.confidence,
          reasoning: generated.reasoning
        },
        htmlSnapshot,
        logs: getExecutionLogs(scraperId),
        scrapedData: result
      });

      return {
        success: true,
        data: result,
        executionMode: 'llm-generated',
        duration: Date.now() - startTime,
        itemCount: resultCount
      };
    } catch (error: any) {
      log(scraperId, 'error', `LLM generation failed: ${error.message}`);
      
      // Store failure details too
      this.storeExecutionDetails({
        scraperId,
        scraperName: config.name,
        executionMode: 'llm-generated',
        itemCount: 0,
        duration: Date.now() - startTime,
        generatedScript: generatedCode ? {
          code: generatedCode,
          confidence: generatedConfidence,
          reasoning: generatedReasoning
        } : undefined,
        htmlSnapshot: htmlSnapshot || undefined,
        logs: getExecutionLogs(scraperId),
        scrapedData: []
      });
      
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
      await new Promise(resolve => setTimeout(resolve, 2000)); // Let JS execute
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

      // Create a safe execution environment with necessary imports available
      const scrapeDataFunction = new Function('page', 'config', 'cheerio', 'puppeteer', `
        ${code}
        return scrapeData(page, config);
      `);

      const result = await scrapeDataFunction(page, config, cheerio, puppeteer);
      
      // Ensure we always return an array
      if (!result) {
        console.error('Generated script returned undefined/null');
        return [];
      }
      
      return Array.isArray(result) ? result : [];
    } catch (error: any) {
      console.error('Error executing generated script:', error.message);
      throw error;
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

  /**
   * Get all cached scripts (for API)
   */
  getAllCachedScripts(): CachedScript[] {
    return Array.from(this.scriptCache.entries()).map(([scraperId, script]) => ({
      ...script,
      scraperId,
      runCount: script.successCount + script.failureCount,
      successRate: script.successCount / (script.successCount + script.failureCount)
    }));
  }

  /**
   * Get specific cached script
   */
  getCachedScript(scraperId: number): CachedScript | undefined {
    return this.scriptCache.get(scraperId);
  }

  /**
   * Delete cached script
   */
  deleteCachedScript(scraperId: number): boolean {
    return this.scriptCache.delete(scraperId);
  }
}
