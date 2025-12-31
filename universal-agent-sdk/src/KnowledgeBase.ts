import type { DomainKnowledge } from './types';

export { KnowledgeBase };

interface KnowledgeData {
  successPatterns: any[];
  failurePatterns: any[];
  domainKnowledge: Record<string, DomainKnowledge>;
  promptImprovements: any[];
  contextLibrary: Record<string, ContextTemplate>;
}

interface ContextTemplate {
  description: string;
  commonSelectors?: string[];
  commonPatterns?: string[];
  tools?: string[];
  examples?: string;
  lastUpdated?: string;
}

export class KnowledgeBase {
  private knowledgeKey = 'agentKnowledge';
  private knowledge: KnowledgeData;

  constructor() {
    this.knowledge = this.loadKnowledge();
  }

  private loadKnowledge(): KnowledgeData {
    if (typeof localStorage === 'undefined') {
      return this.getEmptyKnowledge();
    }

    const stored = localStorage.getItem(this.knowledgeKey);
    if (stored) {
      return JSON.parse(stored);
    }
    
    return this.getEmptyKnowledge();
  }

  private getEmptyKnowledge(): KnowledgeData {
    return {
      successPatterns: [],
      failurePatterns: [],
      domainKnowledge: {},
      promptImprovements: [],
      contextLibrary: this.getDefaultContexts()
    };
  }

  saveKnowledge(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.knowledgeKey, JSON.stringify(this.knowledge));
    }
  }

  recordSuccess(scraperConfig: any, script: string, testResult: any, diagnosis: any = null): void {
    const pattern = {
      timestamp: new Date().toISOString(),
      domain: this.extractDomain(scraperConfig),
      templateType: scraperConfig.templateName,
      fieldsExtracted: testResult.fieldsExtracted,
      codePatterns: this.extractCodePatterns(script),
      selectors: this.extractSelectors(script),
      tools: this.extractTools(script),
      successFactors: diagnosis ? diagnosis.successFactors : []
    };

    this.knowledge.successPatterns.push(pattern);
    
    const domain = pattern.domain;
    if (!this.knowledge.domainKnowledge[domain]) {
      this.knowledge.domainKnowledge[domain] = {
        domain,
        successCount: 0,
        failureCount: 0,
        commonSelectors: {},
        commonTools: {},
        commonIssues: {},
        bestPractices: []
      };
    }
    this.knowledge.domainKnowledge[domain].successCount++;
    
    if (this.knowledge.successPatterns.length > 50) {
      this.knowledge.successPatterns.shift();
    }
    
    this.saveKnowledge();
  }

  recordFailure(scraperConfig: any, script: string, testResult: any, diagnosis: any): void {
    const pattern = {
      timestamp: new Date().toISOString(),
      domain: this.extractDomain(scraperConfig),
      templateType: scraperConfig.templateName,
      error: testResult.error,
      rootCause: diagnosis.rootCause,
      failedAt: diagnosis.problems,
      attempted: this.extractCodePatterns(script),
      recommendations: diagnosis.recommendations
    };

    this.knowledge.failurePatterns.push(pattern);
    
    if (this.knowledge.failurePatterns.length > 100) {
      this.knowledge.failurePatterns.shift();
    }
    
    this.saveKnowledge();
  }

  getRelevantContext(scraperConfig: any) {
    const domain = this.extractDomain(scraperConfig);
    const templateType = scraperConfig.templateName;
    
    const context = {
      similarSuccesses: [],
      similarFailures: [],
      domainKnowledge: null as DomainKnowledge | null,
      recommendedPatterns: [] as string[],
      warnings: [] as string[]
    };

    context.similarSuccesses = this.knowledge.successPatterns
      .filter((p: any) => p.domain === domain || p.templateType === templateType)
      .slice(-5);

    context.similarFailures = this.knowledge.failurePatterns
      .filter((p: any) => p.domain === domain || p.templateType === templateType)
      .slice(-5);

    if (this.knowledge.domainKnowledge[domain]) {
      context.domainKnowledge = this.knowledge.domainKnowledge[domain];
    }

    if (context.similarSuccesses.length > 0) {
      const commonSelectors = this.findCommonPatterns(
        context.similarSuccesses.map((s: any) => s.selectors)
      );
      const commonTools = this.findCommonPatterns(
        context.similarSuccesses.map((s: any) => s.tools)
      );
      
      context.recommendedPatterns = [
        ...commonSelectors.map(s => `Selector pattern: ${s}`),
        ...commonTools.map(t => `Tool: ${t}`)
      ];
    }

    if (context.similarFailures.length > 0) {
      const commonIssues = this.findCommonPatterns(
        context.similarFailures.map((f: any) => f.rootCause)
      );
      context.warnings = commonIssues.map(issue => 
        `⚠️ Watch out: Past attempts failed due to "${issue}"`
      );
    }

    return context;
  }

  private getDefaultContexts(): Record<string, ContextTemplate> {
    return {
      'court-calendar': {
        description: 'Court calendar scraping patterns',
        commonSelectors: [
          'table.calendar',
          'div.event-item',
          'li.case-entry'
        ],
        commonPatterns: [
          'Look for table structures with dates',
          'Case numbers are often in format XXX-YYYY-NNNNN',
          'Dates may be in various formats - use flexible parsing'
        ],
        tools: ['cheerio', 'axios', 'dayjs']
      },
      'legislative-bills': {
        description: 'Legislative bill scraping patterns',
        commonSelectors: [
          'div.bill-item',
          'table.bills',
          'a[href*="bill"]'
        ],
        commonPatterns: [
          'Bill numbers often follow state-specific patterns',
          'Status/stage information usually in specific fields',
          'Multiple sponsors may need special handling'
        ],
        tools: ['cheerio', 'axios']
      }
    };
  }

  private extractDomain(config: any): string {
    const url = config.fields?.['step1-calendar_url'] || 
                config.fields?.['step1-court_url'] || 
                config.fields?.['step1-listing_url'] || '';
    
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return 'unknown';
    }
  }

  private extractCodePatterns(script: string): string[] {
    const patterns: string[] = [];
    
    if (script.includes('cheerio')) patterns.push('cheerio');
    if (script.includes('puppeteer')) patterns.push('puppeteer');
    if (script.includes('axios')) patterns.push('axios');
    if (script.includes('pdf-parse')) patterns.push('pdf-parse');
    if (script.includes('dayjs')) patterns.push('dayjs');
    
    if (script.includes('$("') || script.includes("$('")) patterns.push('jquery-style-selectors');
    if (script.includes('.each(')) patterns.push('iteration');
    if (script.includes('async/await')) patterns.push('async-await');
    
    return patterns;
  }

  private extractSelectors(script: string): string[] {
    const selectorRegex = /\$\(['"]([^'"]+)['"]\)/g;
    const selectors: string[] = [];
    let match;
    
    while ((match = selectorRegex.exec(script)) !== null) {
      selectors.push(match[1]);
    }
    
    return [...new Set(selectors)];
  }

  private extractTools(script: string): string[] {
    const tools: string[] = [];
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
    let match;
    
    while ((match = requireRegex.exec(script)) !== null) {
      tools.push(match[1]);
    }
    
    return [...new Set(tools)];
  }

  private findCommonPatterns(items: any[]): string[] {
    const flattened = items.flat();
    const counts: Record<string, number> = {};
    
    flattened.forEach(item => {
      counts[item] = (counts[item] || 0) + 1;
    });
    
    const threshold = items.length * 0.3;
    return Object.entries(counts)
      .filter(([_, count]) => count >= threshold)
      .map(([item]) => item);
  }
}
