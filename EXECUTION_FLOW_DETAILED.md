# Detailed Execution Flow: AI-Enabled Scraper

## Concrete Example: Court Calendar with 4 AI Fields

### Scraper Configuration

**Template:** Court Calendar
**URL:** https://example.court.gov/calendar

**Fields:**
1. `court_name` - Standard (CSS: `.court-title`)
2. `agenda_pdf_url` - Standard (CSS: `a.pdf-link`)
3. `hearing_dates` - **AI-ENABLED** - Prompt: "Extract all hearing dates in YYYY-MM-DD format. Return JSON array."
4. `case_numbers` - **AI-ENABLED** - Prompt: "Extract all case numbers. Return JSON array."
5. `judge_names` - **AI-ENABLED** - Prompt: "List all judges mentioned. Return JSON array."
6. `document_type` - **AI-ENABLED** - Prompt: "What type of document is this: agenda, minutes, order, or notice? Return one word."

---

## Phase 1: User Builds Scraper (Extension)

### Step 1: User Configures Fields
```javascript
// User fills out builder in extension
builderFieldValues = {
  "step1-court_name": ".court-title",
  "step1-agenda_pdf_url": "a.pdf-link",
  "step1-hearing_dates": ".agenda-text",  // Will be processed by AI
  "step1-case_numbers": ".agenda-text",   // Will be processed by AI
  "step1-judge_names": ".agenda-text",    // Will be processed by AI
  "step1-document_type": ".page-content"  // Will be processed by AI
}

// User enables AI and adds prompts
builderAISettings = {
  "step1-hearing_dates": {
    enabled: true,
    prompt: "Extract all hearing dates in YYYY-MM-DD format. Return JSON array."
  },
  "step1-case_numbers": {
    enabled: true,
    prompt: "Extract all case numbers. Return JSON array."
  },
  "step1-judge_names": {
    enabled: true,
    prompt: "List all judges mentioned. Return JSON array."
  },
  "step1-document_type": {
    enabled: true,
    prompt: "What type of document is this: agenda, minutes, order, or notice? Return one word."
  }
}
```

### Step 2: User Clicks "Finish & Export"
```javascript
// Extension packages configuration
scraperConfig = {
  name: "Court Calendar Scraper",
  fields: {
    "step1-court_name": ".court-title",
    "step1-agenda_pdf_url": "a.pdf-link",
    "step1-hearing_dates": ".agenda-text",
    "step1-case_numbers": ".agenda-text",
    "step1-judge_names": ".agenda-text",
    "step1-document_type": ".page-content"
  },
  aiFields: {
    "step1-hearing_dates": {
      enabled: true,
      prompt: "Extract all hearing dates in YYYY-MM-DD format. Return JSON array."
    },
    "step1-case_numbers": {
      enabled: true,
      prompt: "Extract all case numbers. Return JSON array."
    },
    "step1-judge_names": {
      enabled: true,
      prompt: "List all judges mentioned. Return JSON array."
    },
    "step1-document_type": {
      enabled: true,
      prompt: "What type of document is this: agenda, minutes, order, or notice? Return one word."
    }
  }
}
```

---

## Phase 2: AI Script Generation (4-Stage Pipeline)

### Stage 1: Field Analysis
```
AI analyzes each field:

Field: court_name
→ "Standard text extraction from header element."

Field: hearing_dates [AI-ENABLED]
→ "Requires scraping agenda text then using AI to parse unstructured dates. 
   AI will extract and format dates from free-text content."

Field: case_numbers [AI-ENABLED]
→ "Needs AI to identify case number patterns (varies by jurisdiction). 
   Standard regex may miss variations like 'CV-2024-001' vs '2024-CV-001'."

Field: judge_names [AI-ENABLED]
→ "AI required to distinguish judge names from attorney/party names in text.
   Context-aware extraction needed."

Field: document_type [AI-ENABLED]
→ "AI classification of document type based on page content and structure."
```

### Stage 2: Tool Determination
```
AI detects needs:
- cheerio (HTML parsing)
- axios (HTTP requests)
- NO pdf-parse (not scraping PDFs in this example)
```

### Stage 3: Code Generation Prompt

AI receives this prompt:
```
Generate a complete Node.js web scraper based on this configuration:

SCRAPER NAME: Court Calendar Scraper
PACKAGES: cheerio, axios

FIELDS TO EXTRACT:
  step1-court_name: ".court-title"
  step1-agenda_pdf_url: "a.pdf-link"
  step1-hearing_dates: ".agenda-text" [AI-ENABLED]
  step1-case_numbers: ".agenda-text" [AI-ENABLED]
  step1-judge_names: ".agenda-text" [AI-ENABLED]
  step1-document_type: ".page-content" [AI-ENABLED]

AI-ENABLED FIELDS:
  step1-hearing_dates: "Extract all hearing dates in YYYY-MM-DD format. Return JSON array."
  step1-case_numbers: "Extract all case numbers. Return JSON array."
  step1-judge_names: "List all judges mentioned. Return JSON array."
  step1-document_type: "What type of document is this: agenda, minutes, order, or notice? Return one word."

[AI Runtime Context - analyzeWithAI() function examples]
[HTML Parsing Context - cheerio examples]
[Error Handling Context]

REQUIREMENTS:
1. Use async/await
2. FOR AI-ENABLED FIELDS: After scraping content, call analyzeWithAI(content, prompt)
3. Include analyzeWithAI() helper function at top
4. Return JSON with all fields
```

### Stage 4: Generated Script

```javascript
const axios = require('axios');
const cheerio = require('cheerio');

// AI Helper Function - included because we have AI fields
async function analyzeWithAI(content, prompt) {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-coder:6.7b',
        prompt: `${prompt}\n\nContent to analyze:\n${content}`,
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

// Main Scraper Function
module.exports = async function scrape(url) {
  try {
    // Fetch the page
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    // Standard field: court_name (no AI)
    const courtName = $('.court-title').text().trim();
    
    // Standard field: agenda_pdf_url (no AI)
    const agendaPdfUrl = $('a.pdf-link').attr('href');
    
    // AI field 1: hearing_dates
    const agendaText = $('.agenda-text').text();
    const hearingDatesRaw = await analyzeWithAI(
      agendaText,
      'Extract all hearing dates in YYYY-MM-DD format. Return JSON array.'
    );
    const hearingDates = hearingDatesRaw ? JSON.parse(hearingDatesRaw) : [];
    
    // AI field 2: case_numbers
    const caseNumbersRaw = await analyzeWithAI(
      agendaText,  // Same source, different extraction
      'Extract all case numbers. Return JSON array.'
    );
    const caseNumbers = caseNumbersRaw ? JSON.parse(caseNumbersRaw) : [];
    
    // AI field 3: judge_names
    const judgeNamesRaw = await analyzeWithAI(
      agendaText,  // Same source, different extraction
      'List all judges mentioned. Return JSON array.'
    );
    const judgeNames = judgeNamesRaw ? JSON.parse(judgeNamesRaw) : [];
    
    // AI field 4: document_type
    const pageContent = $('.page-content').text();
    const documentType = await analyzeWithAI(
      pageContent,
      'What type of document is this: agenda, minutes, order, or notice? Return one word.'
    );
    
    // Package into final shape
    return {
      success: true,
      data: {
        court_name: courtName,
        agenda_pdf_url: agendaPdfUrl,
        hearing_dates: hearingDates,      // AI-processed
        case_numbers: caseNumbers,        // AI-processed
        judge_names: judgeNames,          // AI-processed
        document_type: documentType       // AI-processed
      }
    };
    
  } catch (error) {
    console.error('Scrape failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};
```

---

## Phase 3: Runtime Execution (When User Runs Script)

### Execution Timeline

```
Time    Action                          Data State
─────────────────────────────────────────────────────────────────
0ms     Start scrape('https://...')     {}

500ms   Fetch HTML with axios           
        ↓
        Load into cheerio               

600ms   Extract court_name              { court_name: "Superior Court" }
        Extract agenda_pdf_url          { ..., agenda_pdf_url: "/agenda.pdf" }
        Extract agenda text (.agenda-text)
        Content: "Hearing on 2024-01-15 for Case CV-2024-001..."

───── AI PROCESSING BEGINS ─────

700ms   Call analyzeWithAI(agendaText, "Extract dates...")
        ↓ HTTP POST to localhost:11434
        ↓ Ollama processes with deepseek-coder
        
3500ms  AI returns: '["2024-01-15", "2024-01-22", "2024-02-05"]'
        Parse JSON → hearingDates array  { ..., hearing_dates: [...] }

3600ms  Call analyzeWithAI(agendaText, "Extract case numbers...")
        ↓ HTTP POST to localhost:11434
        
6400ms  AI returns: '["CV-2024-001", "CV-2024-002", "CR-2024-015"]'
        Parse JSON → caseNumbers array   { ..., case_numbers: [...] }

6500ms  Call analyzeWithAI(agendaText, "List judges...")
        ↓ HTTP POST to localhost:11434
        
9300ms  AI returns: '["Judge Sarah Mitchell", "Judge Robert Chen"]'
        Parse JSON → judgeNames array    { ..., judge_names: [...] }

9400ms  Extract page content (.page-content)
        Call analyzeWithAI(pageContent, "What type of document...")
        ↓ HTTP POST to localhost:11434
        
11200ms AI returns: 'agenda'
        Store → documentType string      { ..., document_type: "agenda" }

───── AI PROCESSING COMPLETE ─────

11300ms Package final data object
        Return { success: true, data: {...} }
```

### Final Output

```json
{
  "success": true,
  "data": {
    "court_name": "Superior Court of California",
    "agenda_pdf_url": "https://example.court.gov/agenda.pdf",
    "hearing_dates": [
      "2024-01-15",
      "2024-01-22",
      "2024-02-05"
    ],
    "case_numbers": [
      "CV-2024-001",
      "CV-2024-002",
      "CR-2024-015"
    ],
    "judge_names": [
      "Judge Sarah Mitchell",
      "Judge Robert Chen"
    ],
    "document_type": "agenda"
  }
}
```

---

## Key Points: How Data Flows

### 1. **Scraping Phase**
```javascript
// Standard fields: Direct extraction
const courtName = $('.court-title').text();  // ← Done

// AI fields: Extract RAW content first
const agendaText = $('.agenda-text').text();  // ← Just the raw text
// agendaText = "Hearing scheduled for January 15, 2024 for Case CV-2024-001..."
```

### 2. **AI Processing Phase**
```javascript
// Send raw content + prompt to AI
const aiResponse = await analyzeWithAI(
  agendaText,  // ← Raw scraped text
  'Extract all hearing dates in YYYY-MM-DD format. Return JSON array.'
);
// aiResponse = '["2024-01-15", "2024-01-22"]'

// Parse AI response into structured data
const hearingDates = JSON.parse(aiResponse);
// hearingDates = ["2024-01-15", "2024-01-22"]
```

### 3. **Packaging Phase**
```javascript
// Combine standard + AI-processed fields into final shape
return {
  success: true,
  data: {
    court_name: courtName,           // ← Standard extraction
    hearing_dates: hearingDates,     // ← AI-processed
    case_numbers: caseNumbers,       // ← AI-processed
    judge_names: judgeNames,         // ← AI-processed
    document_type: documentType      // ← AI-processed
  }
};
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ USER BUILDS SCRAPER IN EXTENSION                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Field 1: court_name       → Selector: .court-title         │
│  Field 2: hearing_dates    → Selector: .agenda-text         │
│           ✅ AI Enabled    → Prompt: "Extract dates..."      │
│  Field 3: case_numbers     → Selector: .agenda-text         │
│           ✅ AI Enabled    → Prompt: "Extract case nums..."  │
│                                                              │
│  [Finish & Export] → [Generate AI Script]                   │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ AI AGENT GENERATES CODE                                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Analyze fields → Detect 2 need AI                       │
│  2. Determine tools → cheerio, axios                         │
│  3. Generate code with:                                      │
│     - analyzeWithAI() helper function                        │
│     - Standard scraping for field 1                          │
│     - AI calls for fields 2 & 3                              │
│                                                              │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼ (User downloads generated script)
┌─────────────────────────────────────────────────────────────┐
│ RUNTIME EXECUTION (node scraper.js)                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  scrape(url) {                                               │
│    1. axios.get(url)           → Fetch HTML                 │
│    2. cheerio.load(html)       → Parse DOM                  │
│    3. $('.court-title').text() → Extract: "Superior Court"  │
│    4. $('.agenda-text').text() → Raw: "Hearing 2024-01..."  │
│       ↓                                                      │
│    5. analyzeWithAI(raw, prompt1)                            │
│       → POST localhost:11434 (Ollama)                        │
│       → AI processes → Returns: '["2024-01-15"]'            │
│       → JSON.parse() → Array                                 │
│       ↓                                                      │
│    6. analyzeWithAI(raw, prompt2)                            │
│       → POST localhost:11434 (Ollama)                        │
│       → AI processes → Returns: '["CV-2024-001"]'           │
│       → JSON.parse() → Array                                 │
│       ↓                                                      │
│    7. return {                                               │
│         success: true,                                       │
│         data: {                                              │
│           court_name: "Superior Court",  ← Direct           │
│           hearing_dates: [...],          ← AI-processed     │
│           case_numbers: [...]            ← AI-processed     │
│         }                                                    │
│       }                                                      │
│  }                                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Critical Points

### ✅ **Same Source, Multiple AI Analyses**
```javascript
// You can scrape ONE element, but analyze it multiple ways:
const agendaText = $('.agenda-text').text();

const dates = await analyzeWithAI(agendaText, "Extract dates...");
const cases = await analyzeWithAI(agendaText, "Extract case numbers...");
const judges = await analyzeWithAI(agendaText, "Extract judges...");
```

### ✅ **AI Response → Structured Data**
```javascript
// AI returns string
const aiResponse = '["2024-01-15", "2024-01-22"]';

// Parse into JavaScript data structure
const dates = JSON.parse(aiResponse);
// Now dates is an array you can iterate, filter, etc.
```

### ✅ **Final Output Shape Matches Template**
```javascript
// Extension knows template structure:
fields: ["court_name", "hearing_dates", "case_numbers"]

// Generated script returns matching shape:
return {
  data: {
    court_name: "...",
    hearing_dates: [...],
    case_numbers: [...]
  }
}
```

### ✅ **Error Handling**
```javascript
// If AI fails, field becomes null/empty
const aiResult = await analyzeWithAI(content, prompt);
const dates = aiResult ? JSON.parse(aiResult) : [];
//                        ^ Safe fallback
```

---

## Performance Note

With 4 AI fields:
- Standard scraping: ~500ms
- AI field 1: +3 seconds
- AI field 2: +3 seconds
- AI field 3: +3 seconds
- AI field 4: +3 seconds
- **Total: ~12-13 seconds**

Each AI call is sequential (awaited), so they don't run in parallel. This could be optimized with `Promise.all()` but sequential is safer for accuracy.
