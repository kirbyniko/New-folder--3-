export class PromptOptimizer {
  private maxTokens: number;
  private avgCharsPerToken = 4;
  private maxChars: number;
  private reserveTokens = 512;

  constructor(maxTokens = 4096) {
    this.maxTokens = maxTokens;
    this.maxChars = maxTokens * this.avgCharsPerToken;
  }

  optimizePrompt(basePrompt: string, contexts: any[], memoryContext: any, htmlSample: string): string {
    const sections: string[] = [];
    let remainingChars = this.maxChars - (this.reserveTokens * this.avgCharsPerToken);

    const compressedBase = this.compressInstructions(basePrompt);
    sections.push(compressedBase);
    remainingChars -= compressedBase.length;

    const htmlBudget = Math.floor(remainingChars * 0.4);
    const optimizedHtml = this.optimizeHtml(htmlSample, htmlBudget);
    sections.push(`\n## HTML SAMPLE\n${optimizedHtml}`);
    remainingChars -= optimizedHtml.length + 20;

    const memoryBudget = Math.floor(remainingChars * 0.3);
    const optimizedMemory = this.compressMemoryContext(memoryContext, memoryBudget);
    if (optimizedMemory) {
      sections.push(`\n## PAST EXPERIENCE\n${optimizedMemory}`);
      remainingChars -= optimizedMemory.length + 25;
    }

    const contextBudget = remainingChars;
    const optimizedContexts = this.prioritizeContexts(contexts, contextBudget);
    if (optimizedContexts) {
      sections.push(`\n## REFERENCE GUIDES\n${optimizedContexts}`);
    }

    return sections.join('\n');
  }

  compressInstructions(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/please\s+/gi, '')
      .replace(/make sure to\s+/gi, '')
      .replace(/you should\s+/gi, '')
      .replace(/for example/gi, 'e.g.')
      .replace(/that is to say/gi, 'i.e.')
      .replace(/in order to/gi, 'to')
      .replace(/\*\*/g, '')
      .replace(/`/g, '')
      .trim();
  }

  optimizeHtml(html: string, maxChars: number): string {
    if (!html || html.length <= maxChars) return html;

    let cleaned = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');
    
    if (cleaned.length > maxChars) {
      const halfChars = Math.floor(maxChars / 2) - 50;
      const beginning = cleaned.substring(0, halfChars);
      const end = cleaned.substring(cleaned.length - halfChars);
      cleaned = beginning + '\n\n[... middle truncated ...]\n\n' + end;
    }

    return cleaned;
  }

  private compressMemoryContext(memoryContext: any, maxChars: number): string {
    if (!memoryContext) return '';

    const sections: string[] = [];
    let usedChars = 0;

    if (memoryContext.similarSuccesses?.length > 0) {
      const successes = memoryContext.similarSuccesses
        .slice(0, 3)
        .map((ep: any) => {
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

    if (memoryContext.domainKnowledge) {
      const dk = memoryContext.domainKnowledge;
      const knowledge: string[] = [];
      
      if (dk.commonSelectors) {
        const topSelectors = Object.entries(dk.commonSelectors)
          .sort(([,a]: any, [,b]: any) => (b as number) - (a as number))
          .slice(0, 5)
          .map(([sel]) => sel)
          .join(', ');
        knowledge.push(`Common selectors: ${topSelectors}`);
      }
      
      const knowledgeStr = knowledge.join('. ');
      if (usedChars + knowledgeStr.length < maxChars * 0.7) {
        sections.push(`Domain knowledge: ${knowledgeStr}`);
        usedChars += knowledgeStr.length + 20;
      }
    }

    return sections.join('\n\n');
  }

  private prioritizeContexts(contexts: any[], maxChars: number): string {
    if (!contexts || contexts.length === 0) return '';

    const prioritized = this.rankContextsByImportance(contexts);
    
    const sections: string[] = [];
    let usedChars = 0;

    for (const context of prioritized) {
      const compressed = this.compressContext(context);
      
      if (usedChars + compressed.length < maxChars) {
        sections.push(compressed);
        usedChars += compressed.length;
      } else {
        const truncated = compressed.substring(0, maxChars - usedChars - 50) + '\n[...]';
        if (truncated.length > 100) {
          sections.push(truncated);
        }
        break;
      }
    }

    return sections.join('\n\n');
  }

  private rankContextsByImportance(contexts: any[]): any[] {
    const importanceMap: Record<string, number> = {
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

  private compressContext(context: any): string {
    let text = `### ${context.title}\n`;
    
    if (context.description) {
      text += this.compressInstructions(context.description) + '\n';
    }
    
    if (context.examples) {
      const examples = context.examples.slice(0, 2).map((ex: any) => {
        return `\`\`\`\n${ex.code || ex}\n\`\`\``;
      }).join('\n');
      text += examples;
    }
    
    return text;
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / this.avgCharsPerToken);
  }

  validatePrompt(prompt: string) {
    const estimatedTokens = this.estimateTokens(prompt);
    return {
      valid: estimatedTokens <= this.maxTokens,
      estimatedTokens,
      maxTokens: this.maxTokens,
      utilizationPercent: (estimatedTokens / this.maxTokens * 100).toFixed(1)
    };
  }
}
