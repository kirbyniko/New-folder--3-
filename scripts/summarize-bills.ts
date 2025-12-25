/**
 * Bill Summarization Script
 * 
 * Uses a local LLM (Ollama) to generate summaries for bills in the database.
 * Only updates summaries when the bill content has changed (via content hash).
 * 
 * Requirements:
 * - Ollama installed locally: https://ollama.ai
 * - Run: ollama pull llama2 (or your preferred model)
 * 
 * Usage:
 * - npx tsx scripts/summarize-bills.ts
 * - npx tsx scripts/summarize-bills.ts --model llama3  (use specific model)
 * - npx tsx scripts/summarize-bills.ts --state CA      (only process CA bills)
 */

import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Ollama API configuration
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';
const DEFAULT_MODEL = 'llama2'; // or 'llama3', 'mistral', etc.

interface Bill {
  id: string;
  bill_number: string;
  title: string;
  description: string | null;
  state_code: string;
  url: string | null;
  summary: string | null;
  content_hash: string | null;
  last_summarized_at: Date | null;
}

interface OllamaRequest {
  model: string;
  prompt: string;
  stream: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
  };
}

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

/**
 * Check if Ollama is running and accessible
 */
async function checkOllamaAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_API_URL}/api/tags`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * List available models in Ollama
 */
async function listAvailableModels(): Promise<string[]> {
  try {
    const response = await fetch(`${OLLAMA_API_URL}/api/tags`);
    if (!response.ok) return [];
    
    const data = await response.json();
    return data.models?.map((m: any) => m.name) || [];
  } catch (error) {
    return [];
  }
}

/**
 * Generate a summary using local LLM via Ollama
 */
async function generateSummary(
  billNumber: string,
  billTitle: string,
  billDescription: string | null,
  billUrl: string | null,
  model: string
): Promise<string | null> {
  const prompt = `Summarize this legislative bill concisely. Do not start with phrases like "Here's a summary" or "Okay" - just provide the summary directly.

Bill: ${billNumber}
Title: ${billTitle}
${billDescription ? `\nDescription:\n${billDescription}` : ''}
${billUrl ? `\nURL: ${billUrl}` : ''}

Provide a 2-3 sentence summary covering:
- What the bill does
- Who it affects
- Key impact if passed

Be factual and concise (under 150 words). If information is limited, focus only on what's known from the title.`;

  try {
    const request: OllamaRequest = {
      model: model,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.3, // Lower temperature for more factual responses
        max_tokens: 300
      }
    };

    const response = await fetch(`${OLLAMA_API_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      console.error(`  ❌ Ollama API error: ${response.status}`);
      return null;
    }

    const data: OllamaResponse = await response.json();
    return data.response.trim();
  } catch (error: any) {
    console.error(`  ❌ Error calling Ollama: ${error.message}`);
    return null;
  }
}

/**
 * Generate content hash for a bill to detect changes
 */
function generateContentHash(bill: Bill): string {
  const content = `${bill.bill_number}|${bill.title}|${bill.description || ''}|${bill.url || ''}`;
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Fetch bill text from URL (basic implementation)
 */
async function fetchBillText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) return null;
    
    const text = await response.text();
    // Basic text extraction - could be enhanced with PDF parsing
    return text.substring(0, 5000); // Limit to first 5000 chars
  } catch (error) {
    return null;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🤖 Bill Summarization Script\n');
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const modelArg = args.find(arg => arg.startsWith('--model='));
  const stateArg = args.find(arg => arg.startsWith('--state='));
  const forceArg = args.includes('--force');
  
  const model = modelArg ? modelArg.split('=')[1] : DEFAULT_MODEL;
  const stateFilter = stateArg ? stateArg.split('=')[1] : null;
  
  // Check Ollama availability
  console.log('🔍 Checking Ollama...');
  const isAvailable = await checkOllamaAvailable();
  
  if (!isAvailable) {
    console.error('❌ Ollama is not running or not accessible');
    console.log('\n📝 To use this script:');
    console.log('  1. Install Ollama: https://ollama.ai');
    console.log('  2. Run: ollama pull llama2');
    console.log('  3. Ensure Ollama is running (it starts automatically)');
    process.exit(1);
  }
  
  console.log('✅ Ollama is running\n');
  
  // List available models
  const availableModels = await listAvailableModels();
  console.log('📦 Available models:', availableModels.join(', '));
  console.log(`🎯 Using model: ${model}\n`);
  
  if (!availableModels.includes(model)) {
    console.error(`❌ Model "${model}" not found`);
    console.log(`\n💡 Run: ollama pull ${model}`);
    process.exit(1);
  }
  
  // Connect to database
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not found in environment');
  }
  const db = neon(process.env.DATABASE_URL);
  
  try {
    // Get bills that need summarization
    let bills: Bill[];
    
    if (stateFilter) {
      if (forceArg) {
        // Get all bills for this state
        bills = await db`
          SELECT 
            id,
            bill_number,
            title,
            description,
            state_code,
            url,
            summary,
            content_hash,
            last_summarized_at
          FROM bills
          WHERE state_code = ${stateFilter}
          ORDER BY bill_number 
          LIMIT 5
        `;
      } else {
        // Get bills needing summarization for this state
        bills = await db`
          SELECT 
            id,
            bill_number,
            title,
            description,
            state_code,
            url,
            summary,
            content_hash,
            last_summarized_at
          FROM bills
          WHERE state_code = ${stateFilter}
            AND (summary IS NULL OR content_hash IS NULL OR last_summarized_at IS NULL)
          ORDER BY bill_number 
          LIMIT 100
        `;
      }
    } else {
      if (forceArg) {
        // Get all bills
        bills = await db`
          SELECT 
            id,
            bill_number,
            title,
            description,
            state_code,
            url,
            summary,
            content_hash,
            last_summarized_at
          FROM bills
          ORDER BY state_code, bill_number 
          LIMIT 100
        `;
      } else {
        // Get bills needing summarization
        bills = await db`
          SELECT 
            id,
            bill_number,
            title,
            description,
            state_code,
            url,
            summary,
            content_hash,
            last_summarized_at
          FROM bills
          WHERE summary IS NULL OR content_hash IS NULL OR last_summarized_at IS NULL
          ORDER BY state_code, bill_number 
          LIMIT 100
        `;
      }
    }
    
    if (bills.length === 0) {
      console.log('✅ No bills need summarization');
      return;
    }
    
    console.log(`📋 Found ${bills.length} bills to summarize\n`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < bills.length; i++) {
      const bill = bills[i];
      const progress = `[${i + 1}/${bills.length}]`;
      
      console.log(`${progress} ${bill.state_code} ${bill.bill_number}`);
      console.log(`  📄 ${bill.title}`);
      
      // Generate content hash
      const currentHash = generateContentHash(bill);
      
      // Skip if content hasn't changed
      if (!forceArg && bill.content_hash === currentHash && bill.summary) {
        console.log('  ⏭️  Skipped (no changes)');
        skipCount++;
        continue;
      }
      
      // Generate summary
      console.log('  🤖 Generating summary...');
      const summary = await generateSummary(
        bill.bill_number,
        bill.title,
        bill.description,
        bill.url,
        model
      );
      
      if (!summary) {
        console.log('  ❌ Failed to generate summary');
        errorCount++;
        continue;
      }
      
      // Update database
      try {
        await db`
          UPDATE bills 
          SET summary = ${summary},
              content_hash = ${currentHash},
              last_summarized_at = NOW()
          WHERE id = ${bill.id}
        `;
        
        console.log('  ✅ Summary saved');
        console.log(`  📝 ${summary.substring(0, 100)}...`);
        successCount++;
      } catch (dbError: any) {
        console.log(`  ❌ Database error: ${dbError.message}`);
        errorCount++;
      }
      
      // Small delay to avoid overwhelming the LLM
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Completed: ${successCount} summarized`);
    console.log(`⏭️  Skipped: ${skipCount} (no changes)`);
    console.log(`❌ Failed: ${errorCount}`);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

// Run if called directly
main().catch(console.error);
