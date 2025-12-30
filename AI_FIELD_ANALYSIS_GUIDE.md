# AI Field Analysis Guide

## Overview

The extension now supports **field-level AI analysis** for advanced scraping scenarios. Mark specific fields to use AI processing at runtime, enabling complex data extraction that goes beyond simple CSS selectors.

## Use Cases

### 1. **PDF Date Extraction**
```
Scenario: Scrape a PDF document and extract all court hearing dates
Field: hearing_dates
AI Prompt: "Extract all court hearing dates in YYYY-MM-DD format. Return as JSON array."

Generated code will:
1. Download PDF
2. Parse with pdf-parse
3. Send text to local LLM
4. AI returns structured dates
5. Include in final output
```

### 2. **Document Classification**
```
Scenario: Identify what type of legal document was scraped
Field: document_type
AI Prompt: "What type of legal document is this? (motion, order, complaint, brief). Return one word."

Generated code will:
1. Extract page text
2. Send to AI for classification
3. Return document type
```

### 3. **Unstructured Data Extraction**
```
Scenario: Extract structured data from free-text agenda
Field: agenda_items
AI Prompt: "Extract case numbers, hearing times, and party names. Return as JSON: {caseNumber, time, parties[]}"

Generated code will:
1. Scrape agenda text
2. AI parses unstructured content
3. Returns structured JSON
```

### 4. **Multi-Step PDF Analysis**
```
Scenario: Download PDF → Extract text → Analyze for specific data
Steps:
1. Click "View Document" button
2. Wait for PDF to load
3. Capture download link
4. [AI ENABLED] Extract and analyze dates from PDF

Generated code will:
1. Simulate button click
2. Wait for modal
3. Download PDF
4. Parse PDF text
5. Call analyzeWithAI(pdfText, "Extract dates...")
6. Return AI-processed dates
```

## How to Use

### 1. Enable AI for a Field

When building a scraper:
1. Configure field selector (CSS or capture)
2. **Check "🤖 Uses AI Analysis"** below the field note
3. Expandable section appears with prompt textarea
4. Enter your AI prompt template

### 2. Write Effective AI Prompts

**Good Prompts:**
```
✅ "Extract all dates in YYYY-MM-DD format. Return as JSON array."
✅ "Identify document type: motion, order, complaint, or brief. One word only."
✅ "Extract case number, parties, and hearing time. Return JSON: {caseNumber, parties, time}"
✅ "Find all monetary amounts and return as array of numbers (no $ signs)"
```

**Bad Prompts:**
```
❌ "Tell me about the dates" (too vague)
❌ "What's in this document?" (too broad)
❌ "Extract everything" (no structure)
```

**Best Practices:**
- Be specific about format (JSON, array, one word)
- Limit scope (dates only, not everything)
- Specify return structure
- Keep under 200 characters if possible

### 3. Generated Script Structure

When you mark a field for AI, the generated script includes:

```javascript
// Helper function (auto-included at top)
async function analyzeWithAI(content, prompt) {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-coder:6.7b',
        prompt: `${prompt}\n\nContent:\n${content}`,
        stream: false,
        options: { temperature: 0.3, num_predict: 500 }
      })
    });
    const data = await response.json();
    return data.response.trim();
  } catch (error) {
    console.error('AI analysis failed:', error);
    return null;
  }
}

// In main scraper function
module.exports = async function scrape(url) {
  // ... scraping logic ...
  
  // Standard field
  const title = $('h1.title').text();
  
  // AI-enabled field
  const pdfUrl = $('a.pdf-link').attr('href');
  const pdfBuffer = await downloadPDF(pdfUrl);
  const pdfData = await pdfParse(pdfBuffer);
  const dates = await analyzeWithAI(
    pdfData.text,
    'Extract all dates in YYYY-MM-DD format. Return as JSON array.'
  );
  
  return {
    success: true,
    data: {
      title,
      dates: JSON.parse(dates) // AI-processed data
    }
  };
};
```

## Workflow

### Step-by-Step Example: Court Calendar Scraper

**Goal**: Scrape court website, download agenda PDF, extract hearing dates with AI

#### Step 1: Build Basic Scraper
1. Field: `court_url` → Capture website URL selector
2. Field: `agenda_pdf_link` → Capture PDF download link
3. Field: `case_list` → Capture case number list

#### Step 2: Add AI-Enabled Field
1. Add field: `hearing_dates`
2. Selector: (leave empty - AI will process PDF text)
3. ✅ Check "Uses AI Analysis"
4. AI Prompt: `Extract all hearing dates in YYYY-MM-DD format from this court agenda. Return as JSON array.`

#### Step 3: Configure Multi-Step Interaction
1. Expand "Advanced: Multi-Step Capture"
2. Add Step 1: **Action** = Click, **Selector** = `button.view-agenda`
3. Add Step 2: **Action** = Wait 2 seconds
4. Add Step 3: **Capture** = `a.pdf-download`

#### Step 4: Generate & Export
1. Click "Finish & Export"
2. Click "🤖 Generate AI Script"
3. AI analyzes requirements
4. Generated script includes:
   - Button click simulation
   - PDF download logic
   - pdf-parse integration
   - analyzeWithAI() call for dates
   - Complete error handling

#### Step 5: Run Generated Script
```bash
node generated-scraper.js
```

Output:
```json
{
  "success": true,
  "data": {
    "court_url": "https://example.court.gov",
    "agenda_pdf_link": "https://example.court.gov/agenda.pdf",
    "case_list": ["2024-CV-001", "2024-CV-002"],
    "hearing_dates": ["2024-01-15", "2024-01-22", "2024-02-05"]
  }
}
```

## AI Model Requirements

### Recommended Models

| Model | Size | Quality | Speed | Use Case |
|-------|------|---------|-------|----------|
| `deepseek-coder:6.7b` | 3.8GB | Excellent | Fast | **Recommended** |
| `codellama:13b` | 13GB | Excellent | Medium | High accuracy |
| `mistral:7b` | 4GB | Good | Fast | Quick analysis |

### Installation

```bash
# Install Ollama
# Windows: https://ollama.ai/download
# Mac: brew install ollama

# Pull recommended model
ollama pull deepseek-coder:6.7b

# Start Ollama (runs in background)
ollama serve
```

## Advanced Patterns

### Pattern 1: Chained AI Analysis
```
Field 1: raw_content (scrape)
Field 2: document_type (AI classify raw_content)
Field 3: key_dates (AI extract dates from raw_content)
```

### Pattern 2: Conditional AI Processing
```javascript
// Only use AI if content matches pattern
const rawText = $('.content').text();
if (rawText.includes('PDF') || rawText.includes('scanned')) {
  const structured = await analyzeWithAI(rawText, prompt);
} else {
  const structured = parseHTML(rawText); // standard parsing
}
```

### Pattern 3: Multi-Stage PDF Analysis
```
Step 1: Click "View Documents"
Step 2: Wait for modal
Step 3: Capture all PDF links
Field: document_summaries (AI-ENABLED)
Prompt: "Summarize each document in one sentence"
```

## Performance Considerations

### Timing
- Standard scraping: ~1-2 seconds
- AI analysis: +10-30 seconds per field
- Total: Plan for 30-60 seconds per AI-enabled scraper

### Best Practices
1. **Limit AI Fields**: Only use AI for complex extraction (2-3 fields max)
2. **Batch Processing**: If scraping multiple pages, consider batch AI processing
3. **Error Handling**: Always include fallbacks if AI fails
4. **Prompt Optimization**: Shorter prompts = faster responses

### Cost Analysis
- **Local LLM**: $0 (runs on user hardware)
- **API LLM**: $0.001-0.01 per request (if using Claude/GPT)
- **Hardware**: 8GB RAM minimum, GPU optional

## Troubleshooting

### "AI analysis failed"
**Cause**: Ollama not running or wrong model
**Solution**: 
```bash
ollama list  # Check installed models
ollama serve # Start Ollama
```

### "Response is not valid JSON"
**Cause**: AI returned explanation instead of data
**Solution**: Update prompt to be more explicit:
```
❌ "Extract dates from this PDF"
✅ "Extract dates in YYYY-MM-DD format. Return ONLY a JSON array, no explanations."
```

### Slow Generation
**Cause**: Large context or small model
**Solution**:
- Use smaller prompt
- Switch to faster model (mistral:7b)
- Reduce pdf-parse output size

### Wrong Data Extracted
**Cause**: Ambiguous prompt
**Solution**: Add examples to prompt:
```
"Extract hearing dates. Example output: ['2024-01-15', '2024-01-22']"
```

## API Reference

### AI Settings Object
```javascript
{
  "step1-field_name": {
    "enabled": true,
    "prompt": "Extract data in format X"
  }
}
```

### Generated analyzeWithAI Function
```javascript
async function analyzeWithAI(content, prompt) {
  // Sends content + prompt to local Ollama
  // Returns AI response as string
  // Handles errors gracefully
}
```

### Scraper Config with AI
```javascript
{
  name: "Court Calendar Scraper",
  fields: {
    "step1-pdf_link": ".download-link"
  },
  aiFields: {
    "step1-hearing_dates": {
      enabled: true,
      prompt: "Extract dates in YYYY-MM-DD format as JSON array"
    }
  }
}
```

## Examples Library

### Example 1: PDF Invoice Parser
```
Field: invoice_amount (AI-ENABLED)
Prompt: "Find the total amount due. Return only the number, no $ sign."
Steps: Download PDF → Parse → AI extract amount
```

### Example 2: Meeting Minutes Summarizer
```
Field: action_items (AI-ENABLED)
Prompt: "Extract all action items from these meeting minutes. Return as JSON array of objects: [{task, assignee, dueDate}]"
```

### Example 3: Legal Document Classifier
```
Field: doc_category (AI-ENABLED)
Prompt: "Classify this legal document. Return one of: motion, order, complaint, brief, pleading, memo"
```

### Example 4: Multi-Party Extraction
```
Field: parties (AI-ENABLED)
Prompt: "Extract plaintiff(s) and defendant(s) from this case. Return JSON: {plaintiffs: [], defendants: []}"
```

## Future Enhancements

### Planned Features
1. **AI Validation**: Use AI to verify scraped data accuracy
2. **Smart Retry**: If AI fails, retry with simplified prompt
3. **Context Chunking**: Split large PDFs for better AI processing
4. **Prompt Library**: Pre-built prompts for common use cases
5. **Multi-Model**: Try multiple models if one fails

### Experimental
- **Vision AI**: Analyze screenshot images
- **OCR Integration**: Handle scanned PDFs
- **Semantic Search**: Find relevant sections before AI processing

## Resources

- [Ollama Documentation](https://github.com/ollama/ollama)
- [DeepSeek Coder](https://github.com/deepseek-ai/deepseek-coder)
- [pdf-parse npm](https://www.npmjs.com/package/pdf-parse)
- [Cheerio Selectors](https://cheerio.js.org/)
