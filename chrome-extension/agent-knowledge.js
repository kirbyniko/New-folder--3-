// Agent Knowledge Base - Learns from failures and successes
class AgentKnowledge {
  constructor() {
    this.knowledgeKey = 'agentKnowledge';
    this.knowledge = this.loadKnowledge();
  }

  loadKnowledge() {
    const stored = localStorage.getItem(this.knowledgeKey);
    if (stored) {
      return JSON.parse(stored);
    }
    
    return {
      successPatterns: [],
      failurePatterns: [],
      domainKnowledge: {},
      promptImprovements: [],
      contextLibrary: this.getDefaultContexts()
    };
  }

  saveKnowledge() {
    localStorage.setItem(this.knowledgeKey, JSON.stringify(this.knowledge));
  }

  // Learn from a successful scraper
  recordSuccess(scraperConfig, script, testResult, diagnosis = null) {
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
    
    // Update domain knowledge
    const domain = pattern.domain;
    if (!this.knowledge.domainKnowledge[domain]) {
      this.knowledge.domainKnowledge[domain] = {
        successCount: 0,
        patterns: [],
        bestPractices: []
      };
    }
    this.knowledge.domainKnowledge[domain].successCount++;
    this.knowledge.domainKnowledge[domain].patterns.push(pattern);
    
    // Keep only last 50 successes
    if (this.knowledge.successPatterns.length > 50) {
      this.knowledge.successPatterns.shift();
    }
    
    this.saveKnowledge();
  }

  // Learn from a failure
  recordFailure(scraperConfig, script, testResult, diagnosis) {
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
    
    // Keep only last 100 failures
    if (this.knowledge.failurePatterns.length > 100) {
      this.knowledge.failurePatterns.shift();
    }
    
    this.saveKnowledge();
  }

  // Get relevant context for a new scraping task
  getRelevantContext(scraperConfig) {
    const domain = this.extractDomain(scraperConfig);
    const templateType = scraperConfig.templateName;
    
    const context = {
      similarSuccesses: [],
      similarFailures: [],
      domainKnowledge: null,
      recommendedPatterns: [],
      warnings: []
    };

    // Find similar successful scrapers
    context.similarSuccesses = this.knowledge.successPatterns
      .filter(p => p.domain === domain || p.templateType === templateType)
      .slice(-5); // Last 5 similar successes

    // Find similar failures to avoid
    context.similarFailures = this.knowledge.failurePatterns
      .filter(p => p.domain === domain || p.templateType === templateType)
      .slice(-5); // Last 5 similar failures

    // Get domain-specific knowledge
    if (this.knowledge.domainKnowledge[domain]) {
      context.domainKnowledge = this.knowledge.domainKnowledge[domain];
    }

    // Extract recommended patterns
    if (context.similarSuccesses.length > 0) {
      const commonSelectors = this.findCommonPatterns(
        context.similarSuccesses.map(s => s.selectors)
      );
      const commonTools = this.findCommonPatterns(
        context.similarSuccesses.map(s => s.tools)
      );
      
      context.recommendedPatterns = [
        ...commonSelectors.map(s => `Selector pattern: ${s}`),
        ...commonTools.map(t => `Tool: ${t}`)
      ];
    }

    // Generate warnings based on past failures
    if (context.similarFailures.length > 0) {
      const commonIssues = this.findCommonPatterns(
        context.similarFailures.map(f => f.rootCause)
      );
      context.warnings = commonIssues.map(issue => 
        `⚠️ Watch out: Past attempts failed due to "${issue}"`
      );
    }

    return context;
  }

  // Get context library entry
  getContextForTask(taskType) {
    return this.knowledge.contextLibrary[taskType] || null;
  }

  // Add or improve a context template
  updateContextLibrary(taskType, context) {
    this.knowledge.contextLibrary[taskType] = {
      ...this.knowledge.contextLibrary[taskType],
      ...context,
      lastUpdated: new Date().toISOString()
    };
    this.saveKnowledge();
  }

  // Default context library
  getDefaultContexts() {
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
        tools: ['cheerio', 'axios', 'dayjs'],
        examples: `
          // Common pattern for court calendars
          const rows = $('table.calendar tbody tr');
          rows.each((i, row) => {
            const date = $(row).find('td.date').text();
            const caseNumber = $(row).find('td.case').text();
            // ...
          });
        `
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
        tools: ['cheerio', 'axios'],
        examples: `
          // Common pattern for bill listings
          const bills = $('div.bill-item');
          bills.each((i, bill) => {
            const billNumber = $(bill).find('.bill-number').text();
            const title = $(bill).find('.bill-title').text();
            // ...
          });
        `
      },
      'meeting-agendas': {
        description: 'Meeting agenda scraping patterns',
        commonSelectors: [
          'div.agenda-item',
          'table.schedule',
          'li.meeting'
        ],
        commonPatterns: [
          'Agendas often have hierarchical structure',
          'Time/date parsing is critical',
          'Location may be separate from meeting details'
        ],
        tools: ['cheerio', 'axios', 'dayjs'],
        examples: `
          // Common pattern for agendas
          const items = $('div.agenda-item');
          items.each((i, item) => {
            const time = $(item).find('.time').text();
            const topic = $(item).find('.topic').text();
            // ...
          });
        `
      },
      'pdf-extraction': {
        description: 'PDF content extraction patterns',
        commonPatterns: [
          'Use pdf-parse for text extraction',
          'Structure often needs regex parsing',
          'Tables in PDFs are tricky - look for spacing patterns'
        ],
        tools: ['axios', 'pdf-parse'],
        examples: `
          // Common pattern for PDF scraping
          const pdfBuffer = await axios.get(url, { responseType: 'arraybuffer' });
          const data = await pdfParse(pdfBuffer.data);
          const text = data.text;
          // Use regex to extract structured data
        `
      },
      'dynamic-content': {
        description: 'JavaScript-rendered content patterns',
        commonPatterns: [
          'Use Puppeteer for pages with heavy JS',
          'Wait for specific selectors before scraping',
          'May need to trigger interactions (clicks, scrolls)'
        ],
        tools: ['puppeteer'],
        examples: `
          // Common pattern for dynamic content
          const browser = await puppeteer.launch({ headless: true });
          const page = await browser.newPage();
          await page.goto(url, { waitUntil: 'networkidle2' });
          await page.waitForSelector('.content-loaded');
          const html = await page.content();
        `
      }
    };
  }

  // Extract domain from config
  extractDomain(config) {
    const url = config.fields['step1-calendar_url'] || 
                config.fields['step1-court_url'] || 
                config.fields['step1-listing_url'] || '';
    
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return 'unknown';
    }
  }

  // Extract code patterns from script
  extractCodePatterns(script) {
    const patterns = [];
    
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

  // Extract CSS selectors used
  extractSelectors(script) {
    const selectorRegex = /\$\(['"]([^'"]+)['"]\)/g;
    const selectors = [];
    let match;
    
    while ((match = selectorRegex.exec(script)) !== null) {
      selectors.push(match[1]);
    }
    
    return [...new Set(selectors)]; // Unique selectors
  }

  // Extract tools/libraries used
  extractTools(script) {
    const tools = [];
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
    let match;
    
    while ((match = requireRegex.exec(script)) !== null) {
      tools.push(match[1]);
    }
    
    return [...new Set(tools)];
  }

  // Find common patterns across multiple items
  findCommonPatterns(items) {
    const flattened = items.flat();
    const counts = {};
    
    flattened.forEach(item => {
      counts[item] = (counts[item] || 0) + 1;
    });
    
    // Return items that appear in at least 30% of cases
    const threshold = items.length * 0.3;
    return Object.entries(counts)
      .filter(([_, count]) => count >= threshold)
      .map(([item]) => item);
  }

  // Get summary statistics
  getSummary() {
    return {
      totalSuccesses: this.knowledge.successPatterns.length,
      totalFailures: this.knowledge.failurePatterns.length,
      domainsKnown: Object.keys(this.knowledge.domainKnowledge).length,
      successRate: this.calculateSuccessRate(),
      topDomains: this.getTopDomains(),
      commonIssues: this.getCommonIssues()
    };
  }

  calculateSuccessRate() {
    const total = this.knowledge.successPatterns.length + this.knowledge.failurePatterns.length;
    if (total === 0) return 0;
    return (this.knowledge.successPatterns.length / total * 100).toFixed(1);
  }

  getTopDomains() {
    return Object.entries(this.knowledge.domainKnowledge)
      .sort((a, b) => b[1].successCount - a[1].successCount)
      .slice(0, 5)
      .map(([domain, data]) => ({ domain, successCount: data.successCount }));
  }

  getCommonIssues() {
    const recentFailures = this.knowledge.failurePatterns.slice(-20);
    const issues = recentFailures.map(f => f.rootCause);
    return this.findCommonPatterns([issues]);
  }

  // Clear all knowledge (nuclear option)
  clearKnowledge() {
    this.knowledge = {
      successPatterns: [],
      failurePatterns: [],
      domainKnowledge: {},
      promptImprovements: [],
      contextLibrary: this.getDefaultContexts()
    };
    this.saveKnowledge();
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.AgentKnowledge = AgentKnowledge;
}
