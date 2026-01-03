/**
 * Sample IAF Workflows
 * These are pre-configured workflows based on real use cases
 */

import { realScraperWorkflow } from './real-scraper-workflow.js';

export const sampleWorkflows = [
  // Add the REAL working scraper workflow first
  realScraperWorkflow,
  {
    id: 'legislative-scraper-workflow',
    name: 'Legislative Bill Scraper',
    version: '1.0.0',
    description: 'Iterative workflow for scraping state legislative bills, committee meetings, and agendas with intelligent extraction and validation',
    layers: [
      {
        maxAttempts: 5,
        strategy: 'progressive_refinement',
        patterns: [
          'html_table_extraction',
          'pdf_parsing',
          'date_time_normalization'
        ],
        successAction: 'continue',
        failureAction: 'escalate',
        description: 'Extract raw calendar data and committee meetings from legislative website'
      },
      {
        maxAttempts: 3,
        strategy: 'pattern_detection',
        patterns: [
          'bill_id_extraction',
          'regex_patterns',
          'contextual_extraction'
        ],
        successAction: 'continue',
        failureAction: 'retry',
        description: 'Parse bill IDs and titles from agenda PDFs and HTML content'
      },
      {
        maxAttempts: 3,
        strategy: 'progressive_refinement',
        patterns: [
          'api_enrichment',
          'data_enhancement',
          'sponsor_extraction'
        ],
        successAction: 'continue',
        failureAction: 'escalate',
        description: 'Enhance bills with detailed information (sponsors, status, full title)'
      },
      {
        maxAttempts: 2,
        strategy: 'pattern_detection',
        patterns: [
          'date_validation',
          'field_completeness',
          'data_deduplication'
        ],
        successAction: 'stop',
        failureAction: 'escalate',
        description: 'Validate and normalize extracted data before storage'
      }
    ],
    tools: [
      'execute_code',
      'fetch_url',
      'test_scraper'
    ],
    agent: {
      model: 'qwen2.5-coder:14b',
      temperature: 0.2,
      systemPrompt: `You are an expert web scraper specialized in extracting legislative data from state government websites.

Your task is to extract:
- Committee meetings with dates, times, locations
- Bills discussed in each meeting (bill IDs like HB123, SB456)
- Bill titles and descriptions
- Sponsors and status information

Key patterns to recognize:
- Bill formats: HB/SB/HJ/SJ/HCR/SCR followed by numbers
- Date patterns: Various formats (MM/DD/YYYY, Month DD YYYY, etc.)
- PDF parsing: Extract text from agenda PDFs
- HTML tables: Parse structured legislative calendars

Use iterative refinement:
1. First pass: Extract basic structure
2. Second pass: Improve extraction accuracy
3. Third pass: Handle edge cases and validate
4. Fourth pass: Enrich with additional details
5. Final pass: Normalize and deduplicate

Be precise, handle errors gracefully, and always validate your extractions.`
    },
    validation: {
      validators: [
        {
          type: 'field_coverage',
          config: {
            requiredFields: ['date', 'committee', 'bills'],
            minCoverage: 0.8
          }
        },
        {
          type: 'item_count',
          config: {
            minCount: 1,
            maxCount: 500
          }
        }
      ]
    },
    testInput: JSON.stringify({
      name: 'Virginia Legislative Calendar',
      startUrl: 'https://lis.virginia.gov/cgi-bin/legp604.exe?ses=241&typ=cal&month=01',
      pageStructures: [{
        fields: [
          { fieldName: 'date', selector: '.calendarDate', type: 'text' },
          { fieldName: 'committee', selector: '.committeeTitle', type: 'text' },
          { fieldName: 'location', selector: '.location', type: 'text' },
          { fieldName: 'time', selector: '.meetingTime', type: 'text' },
          { fieldName: 'bills', selector: '.billItem', type: 'list' }
        ]
      }]
    }),
    metadata: {
      source: 'Legislative Scraper System',
      useCase: 'State Legislature Data Collection',
      states: ['Virginia', 'Washington', 'Michigan', 'Wisconsin', 'Arizona'],
      created: new Date().toISOString(),
      tags: ['scraping', 'legislation', 'government', 'iterative-learning']
    }
  },
  
  {
    id: 'ai-scraper-generator',
    name: 'AI Scraper Code Generator',
    version: '1.0.0',
    description: 'Iteratively generate and improve web scraper code using AI with batched field processing and continuous learning',
    layers: [
      {
        maxAttempts: 12,
        strategy: 'progressive_refinement',
        patterns: [
          'field_batching',
          'focused_context',
          'incremental_improvement'
        ],
        successAction: 'continue',
        failureAction: 'retry',
        description: 'Generate scraper code for small batches of fields (12 fields per batch) with focused prompts'
      },
      {
        maxAttempts: 10,
        strategy: 'pattern_detection',
        patterns: [
          'test_execution',
          'error_analysis',
          'pattern_learning'
        ],
        successAction: 'continue',
        failureAction: 'retry',
        description: 'Test generated scraper, analyze results, learn patterns from failures'
      },
      {
        maxAttempts: 5,
        strategy: 'progressive_refinement',
        patterns: [
          'script_merging',
          'deduplication',
          'optimization'
        ],
        successAction: 'stop',
        failureAction: 'escalate',
        description: 'Merge batch results into final scraper with optimizations'
      }
    ],
    tools: [
      'execute_code',
      'fetch_url',
      'test_scraper'
    ],
    agent: {
      model: 'qwen2.5-coder:7b',
      temperature: 0.7,
      systemPrompt: `You are an AI that generates web scraper code through iterative learning.

CORE INSIGHT: Generate code in small, focused batches rather than all at once.

Process:
1. Receive 12 fields to extract
2. Analyze page structure for ONLY those fields
3. Generate minimal, focused scraper code
4. Test and refine based on results
5. Learn patterns from successes and failures

Field Batching Strategy:
- Batch 1: Basic fields (title, date, location)
- Batch 2: Complex fields (descriptions, lists, tables)
- Batch 3: Nested fields (bills, sponsors, tags)
- Continue until all fields extracted

For each iteration:
- Use ONLY relevant context for current fields
- Generate clean, executable JavaScript
- Include error handling
- Return structured JSON results
- Learn from test outcomes

Success criteria:
- 80%+ field coverage per batch
- Valid, parseable data
- No runtime errors
- Real data (not placeholders)

If iteration fails, adjust approach:
- Try different selectors
- Change parsing strategy
- Simplify extraction logic
- Focus on what works`
    },
    validation: {
      validators: [
        {
          type: 'field_coverage',
          config: {
            requiredFields: ['generated_code', 'test_results'],
            minCoverage: 0.8
          }
        }
      ]
    },
    testInput: JSON.stringify({
      name: 'Example News Scraper',
      startUrl: 'https://example.com/news',
      pageStructures: [{
        fields: [
          { fieldName: 'title', selector: 'h1.article-title', type: 'text' },
          { fieldName: 'author', selector: '.author-name', type: 'text' },
          { fieldName: 'date', selector: '.publish-date', type: 'text' },
          { fieldName: 'content', selector: '.article-content', type: 'text' },
          { fieldName: 'tags', selector: '.tag', type: 'list' }
        ]
      }]
    }),
    metadata: {
      source: 'Chrome Extension AI Agent',
      useCase: 'Automated Scraper Generation',
      learningEnabled: true,
      created: new Date().toISOString(),
      tags: ['ai', 'code-generation', 'iterative-learning', 'scraping']
    }
  }
];
