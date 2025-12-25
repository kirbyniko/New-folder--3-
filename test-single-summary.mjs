import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

const dbUrl = 'postgresql://neondb_owner:npg_j3RuDlkJep6n@ep-frosty-dream-adlutkdw-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const OLLAMA_API_URL = 'http://localhost:11434';

async function generateSummary(billNumber, billTitle, billUrl, model) {
  const prompt = `You are a legislative bill analyst. Based on the following information, provide a concise summary:

Bill Number: ${billNumber}
Title: ${billTitle}

Provide:
1. A brief 2-3 sentence summary of what this bill likely addresses
2. Key stakeholders or affected groups
3. Potential impact if passed

Keep the summary under 200 words and factual. If the title is unclear, acknowledge limitations.

Summary:`;

  try {
    const request = {
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
      console.error(`Ollama API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.response?.trim() || null;
  } catch (error) {
    console.error('Error calling Ollama:', error.message);
    return null;
  }
}

function generateContentHash(bill) {
  const content = `${bill.bill_number}|${bill.title}|${bill.url || ''}`;
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function test() {
  console.log('🤖 Testing single bill summarization...\n');
  
  const sql = neon(dbUrl);
  
  const bills = await sql`
    SELECT id, bill_number, title, state_code, url
    FROM bills
    WHERE summary IS NULL
    LIMIT 1
  `;
  
  if (bills.length === 0) {
    console.log('✅ No bills need summarization');
    return;
  }
  
  const bill = bills[0];
  console.log('📋 Bill:', bill.bill_number);
  console.log('📄 Title:', bill.title);
  console.log('\n🤖 Generating summary...');
  
  const summary = await generateSummary(
    bill.bill_number,
    bill.title,
    bill.url,
    'llama3.2:latest'
  );
  
  if (!summary) {
    console.log('❌ Failed to generate summary');
    return;
  }
  
  console.log('\n✅ Summary generated:');
  console.log(summary);
  
  const hash = generateContentHash(bill);
  console.log('\n💾 Saving to database...');
  
  await sql`
    UPDATE bills
    SET summary = ${summary},
        content_hash = ${hash},
        last_summarized_at = NOW()
    WHERE id = ${bill.id}
  `;
  
  console.log('✅ Saved!');
}

test();
