# Bill Summarization with Local LLM

This script uses a local LLM (via Ollama) to generate summaries for legislative bills in the database.

## Features

✅ **Incremental updates** - Only processes bills that have changed or lack summaries  
✅ **Content hashing** - Detects when bill content has actually changed  
✅ **No data deletion** - Never drops or clears existing data  
✅ **Local LLM** - Runs completely offline using Ollama  
✅ **Multiple models** - Support for Llama 2, Llama 3, Mistral, etc.

## Setup

### 1. Install Ollama

**Windows/Mac/Linux:**
```bash
# Download from: https://ollama.ai
# or use installer:
curl -fsSL https://ollama.com/install.sh | sh
```

### 2. Download a Model

```bash
# Recommended: Llama 2 (7B - fastest)
ollama pull llama2

# Alternative: Llama 3 (better quality)
ollama pull llama3

# Alternative: Mistral (good balance)
ollama pull mistral
```

### 3. Apply Database Migration

```bash
npx tsx scripts/migrate-bill-summaries.ts
```

This adds three columns to the `bills` table:
- `summary` - LLM-generated summary text
- `content_hash` - SHA-256 hash to detect changes
- `last_summarized_at` - Timestamp of last summarization

## Usage

### Basic Usage

```bash
# Summarize all bills without summaries
npx tsx scripts/summarize-bills.ts
```

### Advanced Options

```bash
# Use specific model
npx tsx scripts/summarize-bills.ts --model=llama3

# Process only bills from specific state
npx tsx scripts/summarize-bills.ts --state=CA

# Force re-summarize all bills (ignore existing summaries)
npx tsx scripts/summarize-bills.ts --force

# Combine options
npx tsx scripts/summarize-bills.ts --model=mistral --state=NY
```

## How It Works

1. **Queries database** for bills without summaries or with changed content
2. **Generates content hash** from bill number, title, and URL
3. **Compares hash** with stored hash to detect changes
4. **Calls Ollama API** to generate summary using local LLM
5. **Updates database** with summary and new hash
6. **Never deletes data** - only adds/updates summaries

## Performance

- **Speed**: ~2-5 seconds per bill (depending on model and hardware)
- **Batch size**: 100 bills per run (adjustable in code)
- **Resource usage**: Runs entirely on your PC, no cloud API costs

## Model Comparison

| Model | Size | Speed | Quality | Recommended For |
|-------|------|-------|---------|----------------|
| llama2 | 7B | Fast | Good | Quick summaries |
| llama3 | 8B | Medium | Better | Balanced |
| mistral | 7B | Fast | Good | Alternative to llama2 |

## Example Output

```
🤖 Bill Summarization Script

🔍 Checking Ollama...
✅ Ollama is running

📦 Available models: llama2, llama3, mistral
🎯 Using model: llama2

📋 Found 45 bills to summarize

[1/45] CA AB-123
  📄 An act relating to education funding
  🤖 Generating summary...
  ✅ Summary saved
  📝 This bill addresses K-12 education funding allocation...

[2/45] NY S-456
  📄 An act relating to healthcare access
  ⏭️  Skipped (no changes)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Completed: 44 summarized
⏭️  Skipped: 1 (no changes)
❌ Failed: 0
```

## Integration with Frontend

The summaries are stored in the `bills` table and will be automatically returned by the API endpoints:

```typescript
// Already included in state-events API response
{
  bills: [
    {
      number: "AB-123",
      title: "An act relating to education",
      summary: "This bill addresses K-12 education funding...",
      url: "https://..."
    }
  ]
}
```

## Scheduling

You can run this on a schedule to keep summaries up to date:

**Windows Task Scheduler:**
```powershell
# Create a scheduled task
$action = New-ScheduledTaskAction -Execute "npx" -Argument "tsx scripts/summarize-bills.ts"
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "Bill Summarization"
```

**Linux Cron:**
```bash
# Add to crontab (runs daily at 2am)
0 2 * * * cd /path/to/project && npx tsx scripts/summarize-bills.ts
```

## Troubleshooting

### Ollama Not Running
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama (if needed)
ollama serve
```

### Model Not Found
```bash
# List installed models
ollama list

# Pull missing model
ollama pull llama2
```

### Database Connection Error
```bash
# Check .env file has DATABASE_URL
cat .env | grep DATABASE_URL

# Test database connection
npx tsx scripts/test-production-connection.ts
```

## Cost Comparison

| Method | Cost | Speed | Quality |
|--------|------|-------|---------|
| **Local LLM (this)** | $0 | 3s/bill | Good |
| OpenAI GPT-4 | $0.03/bill | 1s/bill | Excellent |
| Claude | $0.015/bill | 1s/bill | Excellent |

For 1000 bills:
- **Local**: $0 (uses your PC)
- **OpenAI**: $30
- **Claude**: $15

## Privacy

✅ All processing happens locally on your PC  
✅ No data sent to cloud services  
✅ No API keys required  
✅ Bills never leave your network
