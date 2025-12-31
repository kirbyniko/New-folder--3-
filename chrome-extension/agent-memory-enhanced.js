// Enhanced Agent Memory with Semantic RAG
// Uses TF.js Universal Sentence Encoder for semantic similarity (runs in browser!)

class EnhancedAgentMemory {
  constructor() {
    this.memoryKey = 'agentMemoryEnhanced';
    this.memory = this.loadMemory();
    this.encoder = null; // Will load TF.js USE
    this.encoderReady = false;
    
    // Initialize semantic encoder (lazy load)
    this.initEncoder();
  }

  async initEncoder() {
    try {
      // Load TensorFlow.js and Universal Sentence Encoder
      // This is a 25MB model that runs in browser for semantic embeddings
      if (typeof tf === 'undefined') {
        console.log('📦 Loading TensorFlow.js for semantic search...');
        await this.loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.11.0/dist/tf.min.js');
        await this.loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/universal-sentence-encoder@2.3.3/dist/universal-sentence-encoder.min.js');
      }
      
      console.log('📦 Loading Universal Sentence Encoder model...');
      this.encoder = await use.load();
      this.encoderReady = true;
      console.log('✅ Semantic search ready');
    } catch (error) {
      console.warn('⚠️ Semantic encoder failed to load, using fallback keyword search:', error);
      console.warn('   This is normal - extension still works with keyword-based search');
      this.encoderReady = false;
    }
  }

  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  loadMemory() {
    const stored = localStorage.getItem(this.memoryKey);
    if (stored) {
      return JSON.parse(stored);
    }
    
    return {
      // Episodic memory (specific events)
      episodes: [], // Each scraper generation is an episode
      
      // Semantic memory (general knowledge)
      concepts: {}, // Domain knowledge, patterns, best practices
      
      // Procedural memory (how-to)
      procedures: {}, // Successful techniques by problem type
      
      // Working memory (current session)
      currentSession: null,
      
      // Meta-memory (learning stats)
      stats: {
        totalGenerations: 0,
        successRate: 0,
        avgGenerationTime: 0,
        topDomains: []
      }
    };
  }

  saveMemory() {
    localStorage.setItem(this.memoryKey, JSON.stringify(this.memory));
    // Also save to database
    this.syncToDatabase().catch(err => console.warn('DB sync failed:', err));
  }

  async syncToDatabase() {
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
      // Silent fail - localStorage backup still works
    }
  }

  // Record a complete generation episode
  async recordEpisode(config, script, testResult, diagnosis, conversationHistory) {
    const episode = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      
      // Input context
      domain: this.extractDomain(config.url),
      templateType: config.templateName,
      userIntent: config.description || '',
      
      // Process
      conversationTurns: conversationHistory.length,
      regenerationCount: config.regenerationCount || 0,
      timeSpentMs: config.timeSpentMs || 0,
      
      // Output
      success: !testResult.error,
      script: script,
      testResult: testResult,
      diagnosis: diagnosis,
      
      // For semantic search
      embedding: null, // Will compute if encoder ready
      summary: this.createEpisodeSummary(config, testResult, diagnosis)
    };

    // Compute semantic embedding for similarity search
    if (this.encoderReady) {
      try {
        const embeddings = await this.encoder.embed([episode.summary]);
        episode.embedding = Array.from(embeddings.arraySync()[0]);
        embeddings.dispose(); // Free memory
      } catch (error) {
        console.warn('Failed to compute embedding:', error);
      }
    }

    // Add to episodic memory
    this.memory.episodes.push(episode);
    
    // Keep only last 200 episodes (each ~1-2KB with embedding)
    if (this.memory.episodes.length > 200) {
      this.memory.episodes.shift();
    }

    // Update semantic memory (extract patterns)
    this.updateSemanticMemory(episode);
    
    // Update procedural memory (learn techniques)
    this.updateProceduralMemory(episode);
    
    // Update stats
    this.updateStats(episode);
    
    this.saveMemory();
  }

  createEpisodeSummary(config, testResult, diagnosis) {
    // Create searchable summary for semantic matching
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

  // Find semantically similar past episodes
  async findSimilarEpisodes(currentConfig, limit = 5) {
    const query = this.createEpisodeSummary(currentConfig, {}, {});
    
    if (this.encoderReady && this.memory.episodes.some(e => e.embedding)) {
      // Semantic search using cosine similarity
      try {
        const queryEmbedding = await this.encoder.embed([query]);
        const queryVector = queryEmbedding.arraySync()[0];
        queryEmbedding.dispose();
        
        const similarities = this.memory.episodes
          .filter(e => e.embedding) // Only episodes with embeddings
          .map(episode => ({
            episode,
            similarity: this.cosineSimilarity(queryVector, episode.embedding)
          }))
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, limit);
        
        return similarities.map(s => ({
          ...s.episode,
          relevanceScore: s.similarity
        }));
      } catch (error) {
        console.warn('Semantic search failed, using fallback:', error);
      }
    }
    
    // Fallback: keyword-based search
    return this.keywordSearch(query, limit);
  }

  cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  keywordSearch(query, limit) {
    // Simple keyword-based fallback
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

  // Update semantic memory (general knowledge)
  updateSemanticMemory(episode) {
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
      
      // Extract and count selectors
      const selectors = this.extractSelectors(episode.script);
      selectors.forEach(selector => {
        concept.commonSelectors[selector] = (concept.commonSelectors[selector] || 0) + 1;
      });
      
      // Extract and count tools
      const tools = this.extractTools(episode.script);
      tools.forEach(tool => {
        concept.commonTools[tool] = (concept.commonTools[tool] || 0) + 1;
      });
    } else {
      concept.failureCount++;
      
      // Track common failure patterns
      if (episode.diagnosis.rootCause) {
        const issue = episode.diagnosis.rootCause;
        concept.commonIssues[issue] = (concept.commonIssues[issue] || 0) + 1;
      }
    }
    
    // Prune low-frequency patterns (keep only top 20)
    concept.commonSelectors = this.keepTopN(concept.commonSelectors, 20);
    concept.commonTools = this.keepTopN(concept.commonTools, 20);
    concept.commonIssues = this.keepTopN(concept.commonIssues, 20);
  }

  keepTopN(obj, n) {
    return Object.entries(obj)
      .sort(([,a], [,b]) => b - a)
      .slice(0, n)
      .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});
  }

  // Update procedural memory (techniques)
  updateProceduralMemory(episode) {
    if (!episode.success) return; // Only learn from successes
    
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
    
    // Extract technique from successful script
    const technique = {
      selectors: this.extractSelectors(episode.script),
      tools: this.extractTools(episode.script),
      pattern: this.extractCodePattern(episode.script),
      successRate: 100 // Initial
    };
    
    procedure.successfulTechniques.push(technique);
    procedure.usageCount++;
    procedure.avgSuccessTime = 
      (procedure.avgSuccessTime * (procedure.usageCount - 1) + episode.timeSpentMs) / 
      procedure.usageCount;
    
    // Keep only top 10 techniques
    if (procedure.successfulTechniques.length > 10) {
      procedure.successfulTechniques.shift();
    }
  }

  classifyProblem(episode) {
    // Simple classification based on template and domain
    const domain = episode.domain;
    const template = episode.templateType;
    
    if (template.includes('bill')) return 'bill-tracking';
    if (template.includes('event')) return 'event-calendar';
    if (template.includes('meeting')) return 'meeting-scraping';
    if (template.includes('agenda')) return 'agenda-parsing';
    
    return `${domain}-${template}`;
  }

  // Get comprehensive context for generation
  async getGenerationContext(config) {
    // Find similar episodes (RAG retrieval)
    const similarEpisodes = await this.findSimilarEpisodes(config, 5);
    
    // Get domain knowledge
    const domain = this.extractDomain(config.url);
    const domainConcepts = this.memory.concepts[domain] || null;
    
    // Get relevant procedures
    const problemType = this.classifyProblem({ 
      domain, 
      templateType: config.templateName 
    });
    const procedure = this.memory.procedures[problemType] || null;
    
    return {
      // Retrieved episodes (RAG)
      similarSuccesses: similarEpisodes.filter(e => e.success),
      similarFailures: similarEpisodes.filter(e => !e.success),
      
      // Semantic knowledge
      domainKnowledge: domainConcepts,
      
      // Procedural knowledge
      recommendedTechniques: procedure?.successfulTechniques || [],
      
      // Meta-knowledge
      stats: this.memory.stats
    };
  }

  // Update statistics
  updateStats(episode) {
    const stats = this.memory.stats;
    
    stats.totalGenerations++;
    
    const successCount = this.memory.episodes.filter(e => e.success).length;
    stats.successRate = (successCount / this.memory.episodes.length * 100).toFixed(1);
    
    const totalTime = this.memory.episodes.reduce((sum, e) => sum + (e.timeSpentMs || 0), 0);
    stats.avgGenerationTime = Math.round(totalTime / this.memory.episodes.length);
    
    // Track top domains
    const domainCounts = {};
    this.memory.episodes.forEach(e => {
      domainCounts[e.domain] = (domainCounts[e.domain] || 0) + 1;
    });
    stats.topDomains = Object.entries(domainCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([domain, count]) => ({ domain, count }));
  }

  // Helper: Extract domain from URL
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  }

  // Helper: Extract selectors from script
  extractSelectors(script) {
    const selectors = [];
    const selectorRegex = /['"`]([^'"`]*(?:class|id|tag|attr|text)\([^)]*\)[^'"`]*)['"`]/gi;
    let match;
    while ((match = selectorRegex.exec(script)) !== null) {
      selectors.push(match[1]);
    }
    return [...new Set(selectors)]; // Unique
  }

  // Helper: Extract Playwright tools from script
  extractTools(script) {
    const tools = [];
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

  // Helper: Extract high-level code pattern
  extractCodePattern(script) {
    // Simplified pattern extraction
    if (script.includes('waitForSelector')) return 'wait-based';
    if (script.includes('evaluate')) return 'dom-evaluation';
    if (script.includes('click')) return 'interactive';
    return 'basic-scraping';
  }

  // Get memory statistics for UI
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

  // Clear old memories (keep only recent and important)
  pruneMemory(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 days
    const cutoff = Date.now() - maxAge;
    
    this.memory.episodes = this.memory.episodes.filter(episode => {
      const episodeTime = new Date(episode.timestamp).getTime();
      // Keep if recent OR successful
      return episodeTime > cutoff || episode.success;
    });
    
    this.saveMemory();
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.EnhancedAgentMemory = EnhancedAgentMemory;
}
