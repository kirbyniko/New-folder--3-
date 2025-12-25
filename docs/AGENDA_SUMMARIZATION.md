# Agenda Summarization System

## Overview
This system extracts text from meeting agenda PDFs and generates AI summaries using a local LLM (Ollama).

## Architecture

```
┌─────────────────────────────────────────┐
│  1. SCRAPERS                            │
│     Collect events with docket_url      │
│     Store in events table               │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  2. EXTRACTION (scripts/extract-agendas.ts) │
│     - Finds events with docket_url      │
│     - Downloads PDFs                    │
│     - Extracts text using pdfjs-dist    │
│     - Stores in agenda_summaries table  │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  3. SUMMARIZATION (scripts/summarize-agendas.ts) │
│     - Reads agenda_text from DB         │
│     - Generates summary via Ollama      │
│     - Updates summary column            │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  4. FRONTEND (DataViewer Agendas Tab)   │
│     - Fetches via /api/agenda-summaries │
│     - Displays agendas with summaries   │
│     - Links to original PDFs            │
└─────────────────────────────────────────┘
```

## Database Schema

### `agenda_summaries` table
- `id` - UUID primary key
- `event_id` - Foreign key to events table
- `agenda_url` - URL to PDF/document
- `agenda_text` - Extracted text from PDF
- `summary` - AI-generated summary
- `content_hash` - SHA-256 hash for change detection
- `last_summarized_at` - Timestamp of last summarization
- `created_at` - Creation timestamp

## Usage

### 1. Extract Agendas from PDFs

```bash
# Extract all agendas
npx tsx scripts/extract-agendas.ts

# Extract for specific state
npx tsx scripts/extract-agendas.ts --state=CA

# Limit number of agendas
npx tsx scripts/extract-agendas.ts --limit=10
```

**What it does:**
- Finds events with `docket_url` field
- Downloads and parses PDFs using pdfjs-dist
- Extracts all text from all pages
- Stores text in `agenda_summaries.agenda_text`
- Generates content hash for change detection

### 2. Generate Summaries with LLM

```bash
# Summarize all agendas (only those without summaries)
npx tsx scripts/summarize-agendas.ts

# Use specific model
npx tsx scripts/summarize-agendas.ts --model=gemma3:4b

# Force re-summarize all agendas
npx tsx scripts/summarize-agendas.ts --force

# Summarize specific state
npx tsx scripts/summarize-agendas.ts --state=CA
```

**Requirements:**
- Ollama installed: https://ollama.ai
- At least one model pulled: `ollama pull llama2`

**What it does:**
- Reads `agenda_text` from database
- Sends to Ollama with prompt
- Stores summary in `agenda_summaries.summary`
- Updates `last_summarized_at` timestamp

### 3. View in Frontend

Navigate to **DataViewer** → **📄 Agendas** tab:
- Shows all events with agendas
- Displays AI-generated summaries
- Links to original PDF and event details
- Filters by state/search

## API Endpoint

### `GET /api/agenda-summaries`

Query parameters:
- `state` - Filter by state code (e.g., `CA`)
- `limit` - Max results (default: 100)

Response:
```json
{
  "agendas": [
    {
      "id": "event-uuid",
      "name": "Senate Judiciary Committee",
      "date": "2026-01-15",
      "time": "10:00:00",
      "state": "CA",
      "committee": "Judiciary",
      "docket_url": "https://...",
      "details_url": "https://...",
      "agenda_id": "agenda-uuid",
      "agenda_url": "https://...",
      "agenda_summary": "This meeting will discuss...",
      "last_summarized_at": "2026-01-10T12:00:00Z"
    }
  ]
}
```

## LLM Prompt Template

The system uses this prompt for summarization:

```
Summarize this legislative meeting agenda concisely:

Event: {event_name}

Agenda Content:
{truncated_agenda_text}

URL: {agenda_url}

Provide a 2-3 sentence summary covering:
- Main topics/bills to be discussed
- Key issues or actions planned
- Important deadlines or votes

Be factual and concise (under 150 words).
```

**Settings:**
- Temperature: 0.3 (factual, less creative)
- Max tokens: 300
- Text truncation: First 3000 chars

## Workflow Example

```bash
# 1. Extract agendas from California events
npx tsx scripts/extract-agendas.ts --state=CA

# Output:
# ✅ Found 15 events with docket URLs to process
# 📄 Fetching PDF: https://example.com/agenda.pdf
# ✅ Extracted 2,456 characters from 3 pages
# ✅ Saved agenda (2456 chars)

# 2. Summarize the extracted agendas
npx tsx scripts/summarize-agendas.ts --state=CA --model=gemma3:4b

# Output:
# ✅ Found 15 agendas to summarize
# 📋 Processing: Senate Judiciary Committee (CA)
# ✅ Summary: This meeting will discuss three major bills...
# ✅ Saved summary
```

## Change Detection

The system uses content hashing to avoid re-processing unchanged agendas:

1. **Extract**: Generates SHA-256 hash of `url + text`
2. **Compare**: Checks if hash matches existing record
3. **Skip**: If hash unchanged, skips extraction
4. **Update**: If hash changed, re-extracts and marks for re-summarization

## Supported File Types

Currently supports:
- **PDF** files via pdfjs-dist
- Text is extracted from all pages
- Handles multi-page documents

Future enhancements could add:
- HTML page parsing
- Word documents (.docx)
- Direct text files

## Cost

- **Extraction**: Free (runs locally)
- **Storage**: Free (Cloudflare D1)
- **LLM**: Free (local Ollama)
- **API**: Free (Cloudflare Pages Functions)

**Total: $0/month**

## Troubleshooting

### "Ollama is not running"
```bash
# Install Ollama
# Download from https://ollama.ai

# Pull a model
ollama pull llama2

# Ollama runs automatically after installation
```

### "Failed to fetch PDF"
- Check if URL is accessible
- Some PDFs may require authentication
- Check PDF is not corrupted

### "Not enough text extracted"
- PDF may be image-based (no selectable text)
- Consider OCR for scanned documents

### "No agendas to extract"
- Run scrapers first to populate events
- Check events have `docket_url` field
- Filter by recent dates: `e.date >= CURRENT_DATE`

## Database Migration

The agenda system uses migration `005_add_agenda_summaries.sql`:

```sql
CREATE TABLE agenda_summaries (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  agenda_url TEXT NOT NULL,
  agenda_text TEXT,
  summary TEXT,
  content_hash TEXT,
  last_summarized_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);
```

To apply manually:
```bash
wrangler d1 execute civitracker-db --remote --file="database/migrations/005_add_agenda_summaries.sql"
```

## Future Enhancements

- [ ] OCR support for scanned PDFs
- [ ] HTML agenda parsing
- [ ] Automatic re-summarization on updates
- [ ] Keyword extraction and tagging
- [ ] Bill number detection in agendas
- [ ] Link agendas to specific bills
- [ ] Email notifications for new summaries
- [ ] Search within agenda text
- [ ] Multi-language support
