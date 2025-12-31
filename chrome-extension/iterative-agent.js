/**
 * ITERATIVE LEARNING AGENT
 * 
 * Our strength: Fast local LLM that can iterate 10+ times in seconds
 * Our weakness: Small context window (4096 tokens)
 * 
 * Strategy: Don't try to solve everything in one shot.
 * Make multiple focused passes, learning from each failure.
 */

class IterativeLearningAgent {
  constructor(aiAgent, backendUrl = 'http://localhost:3002') {
    this.aiAgent = aiAgent;
    this.backendUrl = backendUrl;
    this.maxIterations = 10;
    this.learningHistory = [];
  }

  /**
   * CORE INSIGHT: Divide 72 fields into small batches (10-15 each)
   * Try each batch separately, learn what works, retry failures
   */
  async extractWithIterativeLearning(scraperConfig, url, pageStructure) {
    console.log('🔄 Starting iterative learning extraction');
    
    // Step 1: Divide fields into manageable batches
    const fieldBatches = this.createFieldBatches(scraperConfig, 12); // ~12 fields per batch
    console.log(`📦 Split ${Object.keys(scraperConfig.fields).length} fields into ${fieldBatches.length} batches`);

    const allResults = {};
    const allMetadata = { iterations: 0, batchResults: [] };

    // Step 2: Process each batch with learning
    for (let batchIdx = 0; batchIdx < fieldBatches.length; batchIdx++) {
      const batch = fieldBatches[batchIdx];
      console.log(`\n🎯 Processing batch ${batchIdx + 1}/${fieldBatches.length} (${batch.fields.length} fields)`);

      const batchResult = await this.processBatchWithRetry(
        batch,
        url,
        pageStructure,
        batchIdx === 0 ? null : allResults // Pass previous results as context
      );

      // Merge results
      Object.assign(allResults, batchResult.data);
      allMetadata.batchResults.push({
        batchIndex: batchIdx,
        fieldsAttempted: batch.fields.length,
        fieldsExtracted: Object.keys(batchResult.data).filter(k => batchResult.data[k] !== null).length,
        iterations: batchResult.iterations,
        learnedPatterns: batchResult.learnedPatterns
      });
      allMetadata.iterations += batchResult.iterations;
    }

    return {
      success: true,
      data: allResults,
      metadata: allMetadata
    };
  }

  /**
   * Process a single batch with up to 3 retry attempts
   */
  async processBatchWithRetry(batch, url, pageStructure, previousResults) {
    let attempt = 0;
    let extractedData = {};
    let failedFields = [...batch.fields];
    const learnedPatterns = [];

    while (attempt < 3 && failedFields.length > 0) {
      attempt++;
      console.log(`  🔄 Attempt ${attempt} for ${failedFields.length} fields`);

      // Build focused prompt for this attempt
      const prompt = this.buildFocusedPrompt({
        fields: failedFields,
        url,
        pageStructure,
        previousResults,
        learnedPatterns,
        attempt
      });

      // Generate scraper with focused prompt
      const scraperCode = await this.generateFocusedScraper(prompt);
      
      // Execute scraper
      const result = await this.executeScraper(scraperCode, url);

      if (result.success && result.data) {
        // Analyze what worked and what didn't
        const analysis = this.analyzeResults(result.data, failedFields);
        
        // Merge successful extractions
        Object.assign(extractedData, analysis.extracted);
        
        // Learn from patterns
        learnedPatterns.push(...analysis.patterns);
        
        // Update failed fields list
        failedFields = analysis.stillFailed;

        console.log(`  ✅ Extracted ${analysis.extracted.length} fields`);
        console.log(`  ⚠️  ${failedFields.length} fields still missing`);
        
        // If we got everything, stop iterating
        if (failedFields.length === 0) break;
      } else {
        console.log(`  ❌ Attempt ${attempt} failed:`, result.error);
      }
    }

    return {
      data: extractedData,
      iterations: attempt,
      learnedPatterns
    };
  }

  /**
   * Build a MINIMAL prompt focused only on specific fields
   * This is the key: small context = focus on what matters
   */
  buildFocusedPrompt({ fields, url, pageStructure, previousResults, learnedPatterns, attempt }) {
    let prompt = `Extract these ${fields.length} fields from ${url}:\n\n`;

    // List target fields
    fields.forEach(field => {
      prompt += `- ${field.name}`;
      if (field.selector) prompt += ` (try: ${field.selector})`;
      prompt += '\n';
    });

    // Add learned patterns from previous attempts
    if (learnedPatterns.length > 0) {
      prompt += `\n💡 LEARNED PATTERNS (from attempt ${attempt - 1}):\n`;
      learnedPatterns.slice(-3).forEach(pattern => {
        prompt += `- ${pattern}\n`;
      });
    }

    // Add hints from page structure (top 5 relevant IDs/classes)
    if (pageStructure) {
      const hints = this.extractRelevantHints(pageStructure, fields);
      if (hints.length > 0) {
        prompt += `\n🎯 PAGE HINTS:\n${hints.slice(0, 5).join('\n')}\n`;
      }
    }

    // Minimal example (always include this for syntax reference)
    prompt += `
MINIMAL EXAMPLE:
\`\`\`javascript
const puppeteer = require('puppeteer');
module.exports = async function scrape(url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, {waitUntil: 'networkidle0'});
  
  const data = await page.evaluate(() => ({
    field1: document.querySelector('.selector')?.textContent?.trim() || null,
    field2: Array.from(document.querySelectorAll('.item')).map(el => 
      el.querySelector('.name')?.textContent?.trim() || null
    )
  }));
  
  await browser.close();
  return {success: true, data, metadata: {fieldsFound: Object.keys(data).filter(k => data[k] !== null).length}};
};
\`\`\`

CRITICAL: Return ONLY fields you found. Set failed fields to null.
Return: {success: true, data: {...}, metadata: {fieldsFound: N}}
`;

    return prompt;
  }

  /**
   * Create field batches - group related fields together
   */
  createFieldBatches(scraperConfig, batchSize = 12) {
    const allFields = Object.entries(scraperConfig.fields)
      .filter(([id]) => !id.startsWith('step1-'))
      .map(([id, selector]) => ({
        name: id,
        selector: selector,
        aiPrompt: scraperConfig.aiFields?.[id]?.prompt || null
      }));

    const batches = [];
    for (let i = 0; i < allFields.length; i += batchSize) {
      batches.push({
        fields: allFields.slice(i, i + batchSize),
        batchIndex: Math.floor(i / batchSize)
      });
    }

    return batches;
  }

  /**
   * Analyze results to learn patterns
   */
  analyzeResults(data, attemptedFields) {
    const extracted = {};
    const stillFailed = [];
    const patterns = [];

    attemptedFields.forEach(field => {
      const value = data[field.name];
      if (value !== null && value !== undefined && value !== '') {
        extracted[field.name] = value;
        
        // Learn from success: what selector pattern worked?
        if (typeof value === 'string' && value.includes('class')) {
          patterns.push(`${field.name} found using class selector`);
        }
      } else {
        stillFailed.push(field);
      }
    });

    return { extracted, stillFailed, patterns };
  }

  /**
   * Extract relevant hints from page structure for specific fields
   */
  extractRelevantHints(pageStructure, fields) {
    const hints = [];
    const fieldKeywords = fields.map(f => f.name.toLowerCase().split(/[-_]/)).flat();

    // Look for IDs/classes that match field keywords
    if (pageStructure.includes('Relevant IDs:')) {
      const idsLine = pageStructure.split('\n').find(l => l.includes('Relevant IDs:'));
      const ids = idsLine.split(':')[1].split(',');
      
      ids.forEach(id => {
        const idLower = id.toLowerCase();
        const match = fieldKeywords.find(kw => idLower.includes(kw));
        if (match) hints.push(`#${id.trim()} (matches "${match}")`);
      });
    }

    return hints;
  }

  /**
   * Generate focused scraper with minimal prompt
   */
  async generateFocusedScraper(prompt) {
    // Use the existing AI agent but with focused prompt
    const response = await this.aiAgent.queryLLM(prompt, { stream: false });
    
    // Extract code from response
    const codeMatch = response.match(/```(?:javascript|js)?\n([\s\S]*?)```/);
    if (codeMatch) {
      return codeMatch[1].trim();
    }
    
    return response;
  }

  /**
   * Execute scraper code
   */
  async executeScraper(code, url) {
    try {
      const response = await fetch(`${this.backendUrl}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, url })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Export for use in ai-agent.js
window.IterativeLearningAgent = IterativeLearningAgent;
