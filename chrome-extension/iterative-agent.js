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
   * CORE INSIGHT: Instead of extracting directly, generate a better scraper
   * by iteratively testing and improving it with focused context
   */
  async generateScraperWithIterativeLearning(scraperConfig, url, pageStructure) {
    console.log('🔄 Starting iterative scraper generation (multi-pass approach)');
    
    // Step 1: Divide fields into manageable batches
    const fieldBatches = this.createFieldBatches(scraperConfig, 12); // ~12 fields per batch
    console.log(`📦 Split ${Object.keys(scraperConfig.fields).length} fields into ${fieldBatches.length} batches`);

    let combinedScript = null;
    let allLearnedPatterns = [];
    let totalIterations = 0;

    // Step 2: Generate scraper for each batch, then combine
    for (let batchIdx = 0; batchIdx < fieldBatches.length; batchIdx++) {
      const batch = fieldBatches[batchIdx];
      console.log(`\n🎯 Generating scraper for batch ${batchIdx + 1}/${fieldBatches.length} (${batch.fields.length} fields)`);

      const batchResult = await this.generateBatchScraper(
        batch,
        url,
        pageStructure,
        allLearnedPatterns,
        batchIdx
      );

      totalIterations += batchResult.iterations;
      allLearnedPatterns.push(...batchResult.learnedPatterns);

      // Merge scripts
      if (!combinedScript) {
        combinedScript = batchResult.script;
      } else {
        // Merge field extractions from multiple batches
        combinedScript = this.mergeScraperScripts(combinedScript, batchResult.script);
      }
    }

    return {
      script: combinedScript,
      metadata: {
        totalIterations,
        batches: fieldBatches.length,
        learnedPatterns: allLearnedPatterns
      }
    };
  }

  /**
   * Generate scraper for a single batch with retry
   */
  async generateBatchScraper(batch, url, pageStructure, learnedPatterns, batchIdx) {
    let attempt = 0;
    let bestScript = null;
    let learnedFromBatch = [];

    while (attempt < 2 && !bestScript) { // Max 2 attempts per batch
      attempt++;
      console.log(`  🔄 Attempt ${attempt} for batch ${batchIdx + 1}`);

      // Build focused prompt
      const prompt = this.buildFocusedPrompt({
        fields: batch.fields,
        url,
        pageStructure,
        previousResults: null,
        learnedPatterns: [...learnedPatterns, ...learnedFromBatch],
        attempt
      });

      // Generate scraper code
      const script = await this.generateFocusedScraper(prompt);
      
      // Quick validation: does it look like valid code?
      if (script.includes('module.exports') && script.includes('async function')) {
        bestScript = script;
        console.log(`  ✅ Generated scraper for batch ${batchIdx + 1}`);
        
        // Learn from structure
        if (script.includes('querySelector')) learnedFromBatch.push('Uses querySelector pattern');
        if (script.includes('Array.from')) learnedFromBatch.push('Uses Array.from for iteration');
        
        break;
      } else {
        console.log(`  ⚠️ Attempt ${attempt} produced invalid code, retrying...`);
      }
    }

    return {
      script: bestScript || '// Failed to generate',
      iterations: attempt,
      learnedPatterns: learnedFromBatch
    };
  }

  /**
   * Merge two scraper scripts by combining their data extraction logic
   */
  mergeScraperScripts(script1, script2) {
    // Extract data objects from both scripts
    const dataMatch1 = script1.match(/const data = await page\.evaluate\(\(\) => \(([\s\S]*?)\)\);/);
    const dataMatch2 = script2.match(/const data = await page\.evaluate\(\(\) => \(([\s\S]*?)\)\);/);
    
    if (!dataMatch1 || !dataMatch2) {
      console.warn('⚠️ Could not merge scripts, using first one');
      return script1;
    }

    // Combine the data objects
    const data1 = dataMatch1[1];
    const data2 = dataMatch2[1];
    
    // Simple merge: combine the object properties
    const mergedData = data1.slice(0, -1) + ',\n    ' + data2.trim();
    
    return script1.replace(dataMatch1[1], mergedData);
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
    console.log(`  📝 Generating scraper (${Math.ceil(prompt.length / 3.3)} tokens)`);
    
    // Use the existing AI agent's queryOllama method
    const response = await this.aiAgent.queryOllama(prompt, { stream: false });
    
    // Extract code from response
    const codeMatch = response.match(/```(?:javascript|js)?\n([\s\S]*?)```/);
    if (codeMatch) {
      return codeMatch[1].trim();
    }
    
    // If no code block, try to extract module.exports pattern
    const moduleMatch = response.match(/module\.exports\s*=[\s\S]*?};/);
    if (moduleMatch) {
      return moduleMatch[0];
    }
    
    // Last resort: return as-is and hope for the best
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
