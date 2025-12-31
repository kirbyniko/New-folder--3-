import type { Episode, DomainKnowledge, Technique } from './types';

interface MemoryData {
  episodes: Episode[];
  concepts: Record<string, DomainKnowledge>;
  procedures: Record<string, ProcedureMemory>;
  currentSession: string | null;
  stats: MemoryStats;
}

interface ProcedureMemory {
  type: string;
  successfulTechniques: Technique[];
  avgSuccessTime: number;
  usageCount: number;
}

interface MemoryStats {
  totalGenerations: number;
  successRate: number;
  avgGenerationTime: number;
  topDomains: Array<{ domain: string; count: number }>;
}

export class RAGMemory {
  private memoryKey = 'agentMemoryEnhanced';
  private memory: MemoryData;
  private encoderReady = false;

  constructor() {
    this.memory = this.loadMemory();
  }

  private loadMemory(): MemoryData {
    if (typeof localStorage === 'undefined') {
      return this.getEmptyMemory();
    }

    const stored = localStorage.getItem(this.memoryKey);
    if (stored) {
      return JSON.parse(stored);
    }
    
    return this.getEmptyMemory();
  }

  private getEmptyMemory(): MemoryData {
    return {
      episodes: [],
      concepts: {},
      procedures: {},
      currentSession: null,
      stats: {
        totalGenerations: 0,
        successRate: 0,
        avgGenerationTime: 0,
        topDomains: []
      }
    };
  }

  saveMemory(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.memoryKey, JSON.stringify(this.memory));
    }
    this.syncToDatabase().catch(err => console.warn('DB sync failed:', err));
  }

  private async syncToDatabase(): Promise<void> {
    try {
      const response = await fetch('http://localhost:3001/api/rag/episode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episodes: this.memory.episodes,
          concepts: this.memory.concepts
        })
      });
      if (response.ok) {
        console.log('✅ RAG memory synced to database');
      }
    } catch (error) {
      // Silent fail
    }
  }

  async recordEpisode(
    config: any,
    script: string,
    testResult: any,
    diagnosis: any,
    conversationHistory: any[]
  ): Promise<void> {
    const episode: Episode = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      domain: this.extractDomain(config.url),
      templateType: config.templateName,
      userIntent: config.description || '',
      conversationTurns: conversationHistory.length,
      regenerationCount: config.regenerationCount || 0,
      timeSpentMs: config.timeSpentMs || 0,
      success: !testResult.error,
      script: script,
      testResult: testResult,
      diagnosis: diagnosis,
      embedding: null,
      summary: this.createEpisodeSummary(config, testResult, diagnosis)
    };

    this.memory.episodes.push(episode);
    
    if (this.memory.episodes.length > 200) {
      this.memory.episodes.shift();
    }

    this.updateSemanticMemory(episode);
    this.updateProceduralMemory(episode);
    this.updateStats(episode);
    
    this.saveMemory();
  }

  private createEpisodeSummary(config: any, testResult: any, diagnosis: any): string {
    const parts = [];
    
    parts.push(`Scraping ${config.templateName} from ${config.url}`);
    
    if (config.description) {
      parts.push(`Goal: ${config.description}`);
    }
    
    if (testResult.error) {
      parts.push(`Failed with error: ${testResult.error}`);
      if (diagnosis.rootCause) {
        parts.push(`Root cause: ${diagnosis.rootCause}`);
      }
    } else {
      parts.push(`Successfully extracted ${testResult.fieldsExtracted || 0} fields`);
      if (diagnosis.successFactors) {
        parts.push(`Success factors: ${diagnosis.successFactors.join(', ')}`);
      }
    }
    
    return parts.join('. ');
  }

  async findSimilarEpisodes(currentConfig: any, limit = 5): Promise<Episode[]> {
    const query = this.createEpisodeSummary(currentConfig, {}, {});
    return this.keywordSearch(query, limit);
  }

  private keywordSearch(query: string, limit: number): Episode[] {
    const keywords = query.toLowerCase().split(/\s+/);
    
    return this.memory.episodes
      .map(episode => ({
        episode,
        score: keywords.reduce((score, keyword) => {
          return score + (episode.summary.toLowerCase().includes(keyword) ? 1 : 0);
        }, 0)
      }))
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.episode);
  }

  private updateSemanticMemory(episode: Episode): void {
    const domain = episode.domain;
    
    if (!this.memory.concepts[domain]) {
      this.memory.concepts[domain] = {
        domain: domain,
        successCount: 0,
        failureCount: 0,
        commonSelectors: {},
        commonTools: {},
        commonIssues: {},
        bestPractices: []
      };
    }
    
    const concept = this.memory.concepts[domain];
    
    if (episode.success) {
      concept.successCount++;
      
      const selectors = this.extractSelectors(episode.script);
      selectors.forEach(selector => {
        concept.commonSelectors[selector] = (concept.commonSelectors[selector] || 0) + 1;
      });
      
      const tools = this.extractTools(episode.script);
      tools.forEach(tool => {
        concept.commonTools[tool] = (concept.commonTools[tool] || 0) + 1;
      });
    } else {
      concept.failureCount++;
      
      if (episode.diagnosis.rootCause) {
        const issue = episode.diagnosis.rootCause;
        concept.commonIssues[issue] = (concept.commonIssues[issue] || 0) + 1;
      }
    }
    
    concept.commonSelectors = this.keepTopN(concept.commonSelectors, 20);
    concept.commonTools = this.keepTopN(concept.commonTools, 20);
    concept.commonIssues = this.keepTopN(concept.commonIssues, 20);
  }

  private keepTopN(obj: Record<string, number>, n: number): Record<string, number> {
    return Object.entries(obj)
      .sort(([,a], [,b]) => b - a)
      .slice(0, n)
      .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});
  }

  private updateProceduralMemory(episode: Episode): void {
    if (!episode.success) return;
    
    const problemType = this.classifyProblem(episode);
    
    if (!this.memory.procedures[problemType]) {
      this.memory.procedures[problemType] = {
        type: problemType,
        successfulTechniques: [],
        avgSuccessTime: 0,
        usageCount: 0
      };
    }
    
    const procedure = this.memory.procedures[problemType];
    
    const technique: Technique = {
      selectors: this.extractSelectors(episode.script),
      tools: this.extractTools(episode.script),
      pattern: this.extractCodePattern(episode.script),
      successRate: 100
    };
    
    procedure.successfulTechniques.push(technique);
    procedure.usageCount++;
    procedure.avgSuccessTime = 
      (procedure.avgSuccessTime * (procedure.usageCount - 1) + episode.timeSpentMs) / 
      procedure.usageCount;
    
    if (procedure.successfulTechniques.length > 10) {
      procedure.successfulTechniques.shift();
    }
  }

  private classifyProblem(episode: Episode): string {
    const domain = episode.domain;
    const template = episode.templateType;
    
    if (template.includes('bill')) return 'bill-tracking';
    if (template.includes('event')) return 'event-calendar';
    if (template.includes('meeting')) return 'meeting-scraping';
    if (template.includes('agenda')) return 'agenda-parsing';
    
    return `${domain}-${template}`;
  }

  async getGenerationContext(config: any) {
    const similarEpisodes = await this.findSimilarEpisodes(config, 5);
    
    const domain = this.extractDomain(config.url);
    const domainConcepts = this.memory.concepts[domain] || null;
    
    const problemType = this.classifyProblem({ 
      domain, 
      templateType: config.templateName,
      success: true,
      id: '',
      timestamp: '',
      userIntent: '',
      conversationTurns: 0,
      regenerationCount: 0,
      timeSpentMs: 0,
      script: '',
      testResult: {},
      diagnosis: {},
      embedding: null,
      summary: ''
    });
    const procedure = this.memory.procedures[problemType] || null;
    
    return {
      similarSuccesses: similarEpisodes.filter(e => e.success),
      similarFailures: similarEpisodes.filter(e => !e.success),
      domainKnowledge: domainConcepts,
      recommendedTechniques: procedure?.successfulTechniques || [],
      stats: this.memory.stats
    };
  }

  private updateStats(episode: Episode): void {
    const stats = this.memory.stats;
    
    stats.totalGenerations++;
    
    const successCount = this.memory.episodes.filter(e => e.success).length;
    stats.successRate = parseFloat((successCount / this.memory.episodes.length * 100).toFixed(1));
    
    const totalTime = this.memory.episodes.reduce((sum, e) => sum + (e.timeSpentMs || 0), 0);
    stats.avgGenerationTime = Math.round(totalTime / this.memory.episodes.length);
    
    const domainCounts: Record<string, number> = {};
    this.memory.episodes.forEach(e => {
      domainCounts[e.domain] = (domainCounts[e.domain] || 0) + 1;
    });
    stats.topDomains = Object.entries(domainCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([domain, count]) => ({ domain, count }));
  }

  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  }

  private extractSelectors(script: string): string[] {
    const selectors: string[] = [];
    const selectorRegex = /['"`]([^'"`]*(?:class|id|tag|attr|text)\([^)]*\)[^'"`]*)['"`]/gi;
    let match;
    while ((match = selectorRegex.exec(script)) !== null) {
      selectors.push(match[1]);
    }
    return [...new Set(selectors)];
  }

  private extractTools(script: string): string[] {
    const tools: string[] = [];
    const toolPatterns = [
      /page\.goto/g,
      /page\.locator/g,
      /page\.click/g,
      /page\.waitForSelector/g,
      /page\.evaluate/g,
      /page\.screenshot/g
    ];
    
    toolPatterns.forEach(pattern => {
      if (pattern.test(script)) {
        tools.push(pattern.source.replace(/page\\./, '').replace(/\\/g, ''));
      }
    });
    
    return [...new Set(tools)];
  }

  private extractCodePattern(script: string): string {
    if (script.includes('waitForSelector')) return 'wait-based';
    if (script.includes('evaluate')) return 'dom-evaluation';
    if (script.includes('click')) return 'interactive';
    return 'basic-scraping';
  }

  getMemoryStats() {
    return {
      totalEpisodes: this.memory.episodes.length,
      withEmbeddings: this.memory.episodes.filter(e => e.embedding).length,
      concepts: Object.keys(this.memory.concepts).length,
      procedures: Object.keys(this.memory.procedures).length,
      encoderReady: this.encoderReady,
      ...this.memory.stats
    };
  }

  pruneMemory(maxAge = 30 * 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge;
    
    this.memory.episodes = this.memory.episodes.filter(episode => {
      const episodeTime = new Date(episode.timestamp).getTime();
      return episodeTime > cutoff || episode.success;
    });
    
    this.saveMemory();
  }
}
