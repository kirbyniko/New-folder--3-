/**
 * Agent Delegation System
 * 
 * Allows scrapers to automatically call the PDF Parser agent when they encounter
 * PDF agenda URLs. Designed for scheduled execution compatibility.
 */

import { ChatOllama } from '@langchain/ollama';
import { getContextById, AVAILABLE_MODELS } from './context-manager.js';
import fs from 'fs/promises';
import path from 'path';

export interface AgentRequest {
  agentType: 'pdf-parser' | 'agenda-summarizer';
  input: {
    pdfUrl?: string;
    pdfText?: string;
    agendaText?: string;
  };
  model?: string; // Optional: override default model
}

export interface AgentResponse {
  success: boolean;
  data?: any;
  error?: string;
  tokensUsed?: number;
  processingTime?: number;
}

/**
 * Call another agent (for use in scraper scripts)
 * This function can be embedded in generated scrapers
 */
export async function callAgent(request: AgentRequest): Promise<AgentResponse> {
  const startTime = Date.now();
  
  try {
    // Get context template for requested agent
    const context = getContextById(request.agentType);
    if (!context) {
      return {
        success: false,
        error: `Unknown agent type: ${request.agentType}`
      };
    }

    // Get recommended model (or use override)
    const modelName = request.model || context.modelRecommendation || 'qwen2.5-coder:3b';
    
    // Initialize LLM
    const model = new ChatOllama({
      model: modelName,
      baseUrl: 'http://localhost:11434',
      temperature: 0.1, // Low temperature for consistent parsing
    });

    // Build prompt based on agent type
    let prompt: string;
    
    if (request.agentType === 'pdf-parser') {
      if (request.input.pdfUrl) {
        prompt = `Extract bills, tags, and meeting details from this PDF agenda: ${request.input.pdfUrl}

Use pdfjs-dist to download and parse the PDF. Return JSON only.`;
      } else if (request.input.pdfText) {
        prompt = `Parse this PDF agenda text and extract structured data:

${request.input.pdfText}

Extract: bills (HB/SB numbers), tags (topics), virtual links, public comment info.
Return JSON only.`;
      } else {
        return { success: false, error: 'pdfUrl or pdfText required for pdf-parser' };
      }
    } else if (request.agentType === 'agenda-summarizer') {
      if (!request.input.agendaText) {
        return { success: false, error: 'agendaText required for agenda-summarizer' };
      }
      prompt = `Summarize this legislative meeting agenda in 2-3 sentences:

${request.input.agendaText}

Focus on main topics, bills, and meeting type.`;
    } else {
      return { success: false, error: `Unsupported agent type: ${request.agentType}` };
    }

    // Call LLM
    const response = await model.invoke([
      { role: 'system', content: context.systemPrompt },
      { role: 'user', content: prompt }
    ]);

    const processingTime = Date.now() - startTime;

    // Parse response
    let data: any;
    try {
      // Try to parse as JSON first
      const content = response.content as string;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        data = JSON.parse(jsonMatch[0]);
      } else {
        data = { result: content };
      }
    } catch {
      // If not JSON, return as text
      data = { result: response.content };
    }

    return {
      success: true,
      data,
      processingTime,
      tokensUsed: (response.content as string).length // Rough estimate
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      processingTime: Date.now() - startTime
    };
  }
}

/**
 * Generate scraper code that includes PDF parsing capability
 * This is used by the Scraper Builder agent
 */
export function generateScraperWithPDFSupport(baseScraperCode: string, hasAgendaURLs: boolean): string {
  if (!hasAgendaURLs) {
    return baseScraperCode;
  }

  // Add PDF parsing integration to the scraper
  return `${baseScraperCode}

/**
 * PDF Parsing Integration
 * Automatically called when agenda URLs are found
 */
async function parseAgendaPDFs(events) {
  const fs = require('fs').promises;
  const path = require('path');
  
  // Check if PDF parser helper exists
  const parserPath = path.join(__dirname, 'pdf-parser-helper.js');
  let parsePDF;
  
  try {
    const helperExists = await fs.access(parserPath).then(() => true).catch(() => false);
    if (helperExists) {
      parsePDF = require(parserPath).parsePDF;
    }
  } catch (err) {
    console.warn('PDF parser helper not found, skipping PDF parsing');
    return events;
  }

  // Parse PDFs for events with docket_url
  for (const event of events) {
    if (event.docket_url && event.docket_url.toLowerCase().endsWith('.pdf')) {
      try {
        console.log(\`Parsing PDF: \${event.docket_url}\`);
        const parsed = await parsePDF(event.docket_url);
        
        // Enhance event with parsed data
        if (parsed.bills && parsed.bills.length > 0) {
          event.bills = parsed.bills;
        }
        if (parsed.tags && parsed.tags.length > 0) {
          event.tags = [...(event.tags || []), ...parsed.tags];
        }
        if (parsed.virtualLink) {
          event.video_url = event.video_url || parsed.virtualLink;
        }
        if (parsed.summary) {
          event.description = event.description || parsed.summary;
        }
      } catch (err) {
        console.warn(\`Failed to parse PDF for \${event.name}: \${err.message}\`);
      }
    }
  }
  
  return events;
}

// Export enhanced scraper
module.exports = { scrape, parseAgendaPDFs };
`;
}

/**
 * Create PDF parser helper script
 * This is saved alongside scrapers and used by scheduled jobs
 */
export async function createPDFParserHelper(outputDir: string): Promise<void> {
  const helperCode = `/**
 * PDF Parser Helper
 * Standalone script for parsing legislative PDF agendas
 * Can be called by scrapers during scheduled runs
 */

const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');

/**
 * Extract text from PDF
 */
async function extractPDFText(pdfUrl) {
  const response = await fetch(pdfUrl);
  const arrayBuffer = await response.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);
  
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  
  let fullText = '';
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += pageText + '\\n';
  }
  
  return fullText;
}

/**
 * Extract bill numbers from text
 */
function extractBills(text) {
  const billMatches = text.match(/[HS][BJ]\\s*\\d{1,5}/gi);
  if (billMatches) {
    return [...new Set(billMatches.map(b => b.replace(/\\s+/g, ' ').toUpperCase()))];
  }
  return [];
}

/**
 * Generate tags from text using keyword matching
 */
function generateTags(text) {
  const tags = new Set();
  const lowerText = text.toLowerCase();
  
  const topicKeywords = {
    'Healthcare': ['health', 'medical', 'hospital', 'medicaid', 'patient'],
    'Education': ['education', 'school', 'student', 'teacher', 'university'],
    'Environment': ['environment', 'climate', 'pollution', 'conservation'],
    'Transportation': ['highway', 'road', 'vehicle', 'traffic'],
    'Public Safety': ['police', 'fire', 'emergency', 'safety', 'crime'],
    'Tax': [' tax ', 'taxation', 'property tax', 'sales tax'],
    'Veterans': ['veteran', 'military', 'armed forces'],
    'Technology': ['technology', 'digital', 'internet', 'cyber'],
    'Housing': ['housing', 'residential', 'zoning', 'real estate'],
    'Labor': ['labor', 'employment', 'worker', 'wage'],
    'Agriculture': ['agriculture', 'farm', 'livestock', 'crop'],
    'Criminal Justice': ['criminal', 'prison', 'parole', 'sentencing'],
    'Commerce': ['business', 'commerce', 'trade', 'economic'],
    'Government Operations': ['government', 'administrative', 'agency'],
    'Consumer Protection': ['consumer', 'protection', 'fraud'],
    'Civil Rights': ['civil rights', 'discrimination', 'equal']
  };
  
  for (const [tag, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(kw => lowerText.includes(kw))) {
      tags.add(tag);
    }
  }
  
  return Array.from(tags);
}

/**
 * Extract virtual meeting link
 */
function extractVirtualLink(text) {
  const zoomMatch = text.match(/https?:\\/\\/[\\w.-]*zoom\\.us\\/[^\\s]+/i);
  if (zoomMatch) return zoomMatch[0];
  
  const teamsMatch = text.match(/https?:\\/\\/[\\w.-]*teams\\.microsoft\\.com\\/[^\\s]+/i);
  if (teamsMatch) return teamsMatch[0];
  
  const webexMatch = text.match(/https?:\\/\\/[\\w.-]*webex\\.com\\/[^\\s]+/i);
  if (webexMatch) return webexMatch[0];
  
  return null;
}

/**
 * Main parsing function
 */
async function parsePDF(pdfUrl) {
  try {
    const text = await extractPDFText(pdfUrl);
    
    return {
      bills: extractBills(text),
      tags: generateTags(text),
      virtualLink: extractVirtualLink(text),
      publicComment: text.toLowerCase().includes('public comment') || 
                     text.toLowerCase().includes('public testimony'),
      rawText: text.substring(0, 500) // First 500 chars for preview
    };
  } catch (error) {
    console.error('PDF parsing error:', error);
    return {
      bills: [],
      tags: [],
      virtualLink: null,
      publicComment: false,
      error: error.message
    };
  }
}

module.exports = { parsePDF, extractPDFText, extractBills, generateTags };
`;

  const helperPath = path.join(outputDir, 'pdf-parser-helper.js');
  await fs.writeFile(helperPath, helperCode, 'utf-8');
  console.log(`Created PDF parser helper: ${helperPath}`);
}

/**
 * Save scraper to filesystem for scheduled execution
 * Compatible with existing scraper infrastructure
 */
export async function saveScraperForScheduler(
  stateCode: string,
  scraperCode: string,
  outputDir: string = './scrapers'
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });
    
    // Generate filename
    const fileName = `${stateCode.toLowerCase()}-scraper.js`;
    const filePath = path.join(outputDir, fileName);
    
    // Add metadata header
    const codeWithMetadata = `/**
 * Auto-generated scraper for ${stateCode.toUpperCase()}
 * Generated: ${new Date().toISOString()}
 * 
 * Scheduler compatible: Yes
 * PDF parsing: ${scraperCode.includes('parseAgendaPDFs') ? 'Enabled' : 'Disabled'}
 * 
 * Usage:
 *   node ${fileName}
 *   
 * Or from scheduler:
 *   require('./${fileName}').scrape()
 */

${scraperCode}
`;
    
    // Write to file
    await fs.writeFile(filePath, codeWithMetadata, 'utf-8');
    
    // Also create PDF parser helper if not exists
    const helperPath = path.join(outputDir, 'pdf-parser-helper.js');
    const helperExists = await fs.access(helperPath).then(() => true).catch(() => false);
    if (!helperExists && scraperCode.includes('parseAgendaPDFs')) {
      await createPDFParserHelper(outputDir);
    }
    
    return {
      success: true,
      filePath: path.resolve(filePath)
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Load and execute saved scraper (for testing)
 */
export async function executeSavedScraper(
  filePath: string
): Promise<{ success: boolean; events?: any[]; error?: string }> {
  try {
    // Dynamic import
    const scraperModule = await import(filePath);
    
    // Call scrape function
    const events = await scraperModule.scrape();
    
    // If PDF parsing is available, run it
    if (scraperModule.parseAgendaPDFs && Array.isArray(events)) {
      const enhancedEvents = await scraperModule.parseAgendaPDFs(events);
      return { success: true, events: enhancedEvents };
    }
    
    return { success: true, events };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Token estimation for context planning
 */
export function estimateTokens(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters for English
  return Math.ceil(text.length / 4);
}

/**
 * Calculate if knowledge areas fit in model's context window
 */
export function checkContextFit(
  knowledgeAreas: string[],
  modelName: string
): { fits: boolean; totalTokens: number; maxTokens: number; warning?: string } {
  const model = AVAILABLE_MODELS.find(m => m.name === modelName);
  if (!model) {
    return { fits: false, totalTokens: 0, maxTokens: 0, warning: 'Model not found' };
  }

  // Token estimates for each knowledge area (conservative)
  const tokenEstimates: Record<string, number> = {
    'scraper-builder': 800,
    'puppeteer-specialist': 600,
    'scraper-guide': 4000, // SCRAPER_GUIDE_SHORT.md
    'data-analyzer': 400,
    'general-assistant': 300,
    'pdf-parser': 1200, // AGENDA_PDF_PARSER_GUIDE.md
    'agenda-summarizer': 850 // AGENDA_SUMMARIZATION.md
  };

  let totalTokens = 500; // Base system prompt
  for (const area of knowledgeAreas) {
    totalTokens += tokenEstimates[area] || 500;
  }

  // Reserve 30% for user message + response
  const maxUsableTokens = Math.floor(model.contextWindow * 0.7);
  
  const fits = totalTokens <= maxUsableTokens;
  const warning = !fits 
    ? `${totalTokens} tokens exceeds ${maxUsableTokens} usable (70% of ${model.contextWindow}). Switch to larger model or reduce knowledge areas.`
    : undefined;

  return {
    fits,
    totalTokens,
    maxTokens: model.contextWindow,
    warning
  };
}
