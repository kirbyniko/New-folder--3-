// Intelligent Prompt Compression and Context Optimization
// Maximizes information density within token limits

class PromptOptimizer {
  constructor(maxTokens = 4096) {
    this.maxTokens = maxTokens;
    this.avgCharsPerToken = 4; // Rough estimate: 1 token ≈ 4 characters
    this.maxChars = maxTokens * this.avgCharsPerToken;
    this.reserveTokens = 512; // Reserve for system prompt and generation
  }

  // Optimize entire prompt for generation
  optimizePrompt(basePrompt, contexts, memoryContext, htmlSample) {
    const sections = [];
    let remainingChars = this.maxChars - (this.reserveTokens * this.avgCharsPerToken);

    // 1. Base prompt (always included, compressed)
    const compressedBase = this.compressInstructions(basePrompt);
    sections.push(compressedBase);
    remainingChars -= compressedBase.length;

    // 2. HTML sample (critical, but can be truncated)
    const htmlBudget = Math.floor(remainingChars * 0.4); // 40% for HTML
    const optimizedHtml = this.optimizeHtml(htmlSample, htmlBudget);
    sections.push(`\n## HTML SAMPLE\n${optimizedHtml}`);
    remainingChars -= optimizedHtml.length + 20;

    // 3. Memory context (RAG results)
    const memoryBudget = Math.floor(remainingChars * 0.3); // 30% for memory
    const optimizedMemory = this.compressMemoryContext(memoryContext, memoryBudget);
    if (optimizedMemory) {
      sections.push(`\n## PAST EXPERIENCE\n${optimizedMemory}`);
      remainingChars -= optimizedMemory.length + 25;
    }

    // 4. Context guides (remaining space)
    const contextBudget = remainingChars;
    const optimizedContexts = this.prioritizeContexts(contexts, contextBudget);
    if (optimizedContexts) {
      sections.push(`\n## REFERENCE GUIDES\n${optimizedContexts}`);
    }

    return sections.join('\n');
  }

  // Compress instruction text (remove redundancy, shorten)
  compressInstructions(text) {
    return text
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Remove redundant phrases
      .replace(/please\s+/gi, '')
      .replace(/make sure to\s+/gi, '')
      .replace(/you should\s+/gi, '')
      // Shorten common phrases
      .replace(/for example/gi, 'e.g.')
      .replace(/that is to say/gi, 'i.e.')
      .replace(/in order to/gi, 'to')
      // Remove markdown formatting (saves tokens)
      .replace(/\*\*/g, '')
      .replace(/`/g, '')
      .trim();
  }

  // Optimize HTML sample for maximum relevance
  optimizeHtml(html, maxChars) {
    if (!html || html.length <= maxChars) return html;

    // Strategy: Keep most relevant parts of HTML
    
    // 1. Extract and prioritize elements with important attributes
    const importantElements = this.extractImportantElements(html);
    
    // 2. Remove script and style tags (not useful for scraping)
    let cleaned = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, ''); // Remove comments
    
    // 3. Truncate if still too long
    if (cleaned.length > maxChars) {
      // Keep beginning and end (often most structured)
      const halfChars = Math.floor(maxChars / 2) - 50;
      const beginning = cleaned.substring(0, halfChars);
      const end = cleaned.substring(cleaned.length - halfChars);
      cleaned = beginning + '\n\n[... middle truncated ...]\n\n' + end;
    }
    
    // 4. Add important elements as reference
    if (importantElements.length > 0 && cleaned.length < maxChars - 200) {
      const elementsStr = importantElements.slice(0, 5).join('\n');
      if (cleaned.length + elementsStr.length < maxChars) {
        cleaned += `\n\n<!-- Key elements: -->\n${elementsStr}`;
      }
    }

    return cleaned;
  }

  extractImportantElements(html) {
    const important = [];
    
    // Regex to find elements with id, class, data- attributes
    const idRegex = /<([a-z0-9]+)[^>]*\bid=['"]([^'"]+)['"]/gi;
    const classRegex = /<([a-z0-9]+)[^>]*\bclass=['"]([^'"]+)['"]/gi;
    const dataRegex = /<([a-z0-9]+)[^>]*\bdata-[a-z-]+=['"]([^'"]+)['"]/gi;
    
    let match;
    let count = 0;
    
    // Extract elements with IDs (most specific)
    while ((match = idRegex.exec(html)) !== null && count++ < 10) {
      important.push(`<${match[1]} id="${match[2]}">`);
    }
    
    // Extract elements with classes
    count = 0;
    while ((match = classRegex.exec(html)) !== null && count++ < 10) {
      const classes = match[2].split(/\s+/).slice(0, 3).join(' '); // First 3 classes
      important.push(`<${match[1]} class="${classes}">`);
    }
    
    return [...new Set(important)]; // Remove duplicates
  }

  // Compress memory context (RAG results)
  compressMemoryContext(memoryContext, maxChars) {
    if (!memoryContext) return '';

    const sections = [];
    let usedChars = 0;

    // 1. Similar successes (most valuable)
    if (memoryContext.similarSuccesses?.length > 0) {
      const successes = memoryContext.similarSuccesses
        .slice(0, 3) // Top 3 only
        .map(ep => {
          const summary = ep.summary || '';
          const relevance = ep.relevanceScore ? `(${(ep.relevanceScore * 100).toFixed(0)}% match)` : '';
          return `• ${summary} ${relevance}`;
        })
        .join('\n');
      
      if (usedChars + successes.length < maxChars * 0.5) {
        sections.push(`Past successes:\n${successes}`);
        usedChars += successes.length + 20;
      }
    }

    // 2. Domain knowledge (patterns)
    if (memoryContext.domainKnowledge) {
      const dk = memoryContext.domainKnowledge;
      const knowledge = [];
      
      if (dk.commonSelectors) {
        const topSelectors = Object.entries(dk.commonSelectors)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([sel]) => sel)
          .join(', ');
        knowledge.push(`Common selectors: ${topSelectors}`);
      }
      
      if (dk.commonTools) {
        const topTools = Object.entries(dk.commonTools)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([tool]) => tool)
          .join(', ');
        knowledge.push(`Common tools: ${topTools}`);
      }
      
      const knowledgeStr = knowledge.join('. ');
      if (usedChars + knowledgeStr.length < maxChars * 0.7) {
        sections.push(`Domain knowledge: ${knowledgeStr}`);
        usedChars += knowledgeStr.length + 20;
      }
    }

    // 3. Warnings from failures
    if (memoryContext.similarFailures?.length > 0) {
      const warnings = memoryContext.similarFailures
        .slice(0, 2) // Top 2 failures
        .map(ep => ep.diagnosis?.rootCause || ep.summary)
        .filter(Boolean)
        .map(cause => `⚠️ ${cause}`)
        .join('\n');
      
      if (usedChars + warnings.length < maxChars) {
        sections.push(`\nAvoid:\n${warnings}`);
        usedChars += warnings.length + 10;
      }
    }

    return sections.join('\n\n');
  }

  // Prioritize and compress context guides
  prioritizeContexts(contexts, maxChars) {
    if (!contexts || contexts.length === 0) return '';

    // Sort contexts by importance (custom logic can be added)
    const prioritized = this.rankContextsByImportance(contexts);
    
    const sections = [];
    let usedChars = 0;

    for (const context of prioritized) {
      const compressed = this.compressContext(context);
      
      if (usedChars + compressed.length < maxChars) {
        sections.push(compressed);
        usedChars += compressed.length;
      } else {
        // Try to fit a truncated version
        const truncated = compressed.substring(0, maxChars - usedChars - 50) + '\n[...]';
        if (truncated.length > 100) { // Only if meaningful
          sections.push(truncated);
        }
        break; // No more space
      }
    }

    return sections.join('\n\n');
  }

  rankContextsByImportance(contexts) {
    // Define importance scores for different context types
    const importanceMap = {
      'basic-selectors': 10,
      'error-handling': 9,
      'dynamic-content': 8,
      'pagination': 7,
      'authentication': 6,
      'best-practices': 5
    };

    return contexts.sort((a, b) => {
      const scoreA = importanceMap[a.id] || 0;
      const scoreB = importanceMap[b.id] || 0;
      return scoreB - scoreA;
    });
  }

  compressContext(context) {
    let text = `### ${context.title}\n`;
    
    if (context.description) {
      text += this.compressInstructions(context.description) + '\n';
    }
    
    if (context.examples) {
      // Only include 1-2 most relevant examples
      const examples = context.examples.slice(0, 2).map(ex => {
        return `\`\`\`\n${ex.code || ex}\n\`\`\``;
      }).join('\n');
      text += examples;
    }
    
    return text;
  }

  // Estimate token count (rough approximation)
  estimateTokens(text) {
    return Math.ceil(text.length / this.avgCharsPerToken);
  }

  // Check if prompt fits within limits
  validatePrompt(prompt) {
    const estimatedTokens = this.estimateTokens(prompt);
    return {
      valid: estimatedTokens <= this.maxTokens,
      estimatedTokens,
      maxTokens: this.maxTokens,
      utilizationPercent: (estimatedTokens / this.maxTokens * 100).toFixed(1)
    };
  }

  // Adaptive optimization based on model
  optimizeForModel(prompt, modelName) {
    // Adjust max tokens based on model
    if (modelName.includes('7b') || modelName.includes('webgpu')) {
      this.maxTokens = 4096;
    } else if (modelName.includes('14b')) {
      this.maxTokens = 32000; // Qwen 2.5 Coder has 32K context
    } else if (modelName.includes('32b')) {
      this.maxTokens = 32000;
    } else if (modelName.includes('72b')) {
      this.maxTokens = 128000; // Qwen 2.5 Coder 72B has 128K
    }
    
    this.maxChars = this.maxTokens * this.avgCharsPerToken;
    
    return prompt; // Could apply model-specific optimizations here
  }

  // Split long prompts into chunks (for iterative generation)
  chunkPrompt(prompt, chunkSize = 3000) {
    const chunks = [];
    const sections = prompt.split(/\n## /);
    
    let currentChunk = '';
    
    for (const section of sections) {
      if (this.estimateTokens(currentChunk + section) > chunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = '## ' + section;
        } else {
          // Section itself is too large, must split
          chunks.push(section.substring(0, chunkSize * this.avgCharsPerToken));
        }
      } else {
        currentChunk += (currentChunk ? '\n## ' : '') + section;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }
}

if (typeof window !== 'undefined') {
  window.PromptOptimizer = PromptOptimizer;
}
