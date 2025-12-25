/**
 * Agenda Summarization Script
 * 
 * Uses a local LLM (Ollama) to generate summaries for meeting agendas.
 * Only updates summaries when the agenda content has changed (via content hash).
 * 
 * Requirements:
 * - Ollama installed locally: https://ollama.ai
 * - Run: ollama pull llama2 (or your preferred model)
 * - Run extract-agendas.ts first to populate agenda_text
 * 
 * Usage:
 * - npx tsx scripts/summarize-agendas.ts
 * - npx tsx scripts/summarize-agendas.ts --model gemma3:4b  (use specific model)
 * - npx tsx scripts/summarize-agendas.ts --state CA          (only process CA agendas)
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Ollama API configuration
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';
const DEFAULT_MODEL = 'llama2';

interface AgendaSummary {
  id: string;
  event_id: string;
  event_name: string;
  state_code: string;
  agenda_url: string;
  agenda_text: string;
  summary: string | null;
  content_hash: string;
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
 * Check if Ollama is running
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
 * Generate agenda summary using Ollama
 */
async function summarizeAgenda(
  model: string,
  eventName: string,
  agendaText: string,
  agendaUrl: string
): Promise<string | null> {
  // Truncate text if too long (keep first 3000 chars)
  const truncatedText = agendaText.length > 3000 
    ? agendaText.substring(0, 3000) + '...' 
    : agendaText;

  const prompt = `Write a concise summary of this meeting agenda. Use 2-6 sentences depending on what's needed to cover the key topics and items. Do not include preambles like "Here's a summary" - just provide the summary directly.

Event: ${eventName}

Agenda Content:
${truncatedText}

${agendaUrl ? `URL: ${agendaUrl}` : ''}

Focus on:
- Main topics/bills to be discussed
- Key issues or actions planned
- Important deadlines or votes

Be factual and concise.`;

  try {
    const request: OllamaRequest = {
      model: model,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.3,
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
 * Main function
 */
async function main() {
  console.log('🤖 Agenda Summarization Script\n');
  
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
    console.log('  3. Ensure Ollama is running');
    process.exit(1);
  }
  
  console.log('✅ Ollama is running\n');
  
  // List available models
  const availableModels = await listAvailableModels();
  console.log(`📦 Available models: ${availableModels.join(', ')}\n`);
  
  if (!availableModels.includes(model)) {
    console.warn(`⚠️  Model "${model}" not found. Available models: ${availableModels.join(', ')}`);
    console.log(`   Run: ollama pull ${model}\n`);
  } else {
    console.log(`✅ Using model: ${model}\n`);
  }
  
  // Get database connection
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in environment variables');
    process.exit(1);
  }
  
  const sql = neon(databaseUrl);
  
  // Build query to get agendas needing summaries
  let query = `
    SELECT 
      a.id,
      a.event_id,
      e.name as event_name,
      e.state_code,
      a.agenda_url,
      a.agenda_text,
      a.summary,
      a.content_hash,
      a.last_summarized_at
    FROM agenda_summaries a
    INNER JOIN events e ON a.event_id = e.id
    WHERE a.agenda_text IS NOT NULL
    AND a.agenda_text != ''
  `;
  
  if (!forceArg) {
    query += ` AND (a.summary IS NULL OR a.summary = '')`;
  }
  
  if (stateFilter) {
    query += ` AND e.state_code = '${stateFilter}'`;
  }
  
  query += ` ORDER BY e.date ASC`;
  
  console.log(`📊 Fetching agendas...`);
  if (stateFilter) console.log(`   State filter: ${stateFilter}`);
  if (forceArg) console.log(`   Force mode: Re-summarizing all agendas`);
  
  const agendas = await sql(query) as AgendaSummary[];
  
  console.log(`\n✅ Found ${agendas.length} agendas to summarize\n`);
  
  if (agendas.length === 0) {
    console.log('✅ No agendas need summarization');
    console.log('   Run extract-agendas.ts first to populate agenda_text');
    return;
  }
  
  let summarized = 0;
  let failed = 0;
  let skipped = 0;
  
  for (const agenda of agendas) {
    console.log(`\n📋 Processing: ${agenda.event_name} (${agenda.state_code})`);
    console.log(`   Agenda ID: ${agenda.id}`);
    console.log(`   Text length: ${agenda.agenda_text.length} chars`);
    
    // Generate summary
    const summary = await summarizeAgenda(
      model,
      agenda.event_name,
      agenda.agenda_text,
      agenda.agenda_url
    );
    
    if (!summary) {
      console.log(`  ❌ Failed to generate summary`);
      failed++;
      continue;
    }
    
    console.log(`  ✅ Summary: ${summary.substring(0, 100)}...`);
    
    // Update database
    try {
      await sql`
        UPDATE agenda_summaries
        SET 
          summary = ${summary},
          last_summarized_at = NOW()
        WHERE id = ${agenda.id}
      `;
      
      console.log(`  ✅ Saved summary`);
      summarized++;
      
    } catch (error: any) {
      console.error(`  ❌ Failed to save: ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Summarized: ${summarized}`);
  console.log(`   ⚠️  Skipped: ${skipped}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`\n✅ Summarization complete!`);
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
