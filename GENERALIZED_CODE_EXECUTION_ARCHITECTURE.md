# Generalized Code Execution & Field Feedback Architecture

## Overview

A platform-agnostic system for executing agent-generated code and providing structured field-level feedback for iterative improvement.

## Core Concepts

### 1. Code Execution Layer (Generic)

The execute server (`execute-server.ts`) provides universal code execution:

```typescript
interface ExecuteRequest {
  code: string;              // Any JavaScript/Node.js code
  url?: string;              // Optional: URL context (for scrapers)
  args?: any[];              // Optional: Arguments to pass to exported function
  timeout?: number;          // Max execution time (ms)
}

interface ExecuteResponse {
  success: boolean;
  items?: any[];             // Structured output (array of objects)
  result?: any;              // Raw result (any type)
  logs: string[];            // Console output
  duration: number;
  error?: string;
  stack?: string;
}
```

**Key Features:**
- Accepts any code that exports a function or returns a value
- Supports `module.exports`, async/await, and IIFE patterns
- Provides axios, cheerio, puppeteer, and other modules
- Captures console logs for debugging
- Sandboxed execution with timeout protection

### 2. Output Schema Detection (Dynamic)

When agent code runs, the system analyzes the output structure:

```typescript
interface OutputAnalysis {
  type: 'array' | 'object' | 'primitive';
  isStructured: boolean;      // Array of objects with consistent fields
  fields?: FieldDefinition[]; // Detected fields if structured
  itemCount: number;
}

interface FieldDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'url' | 'date';
  required: boolean;
  coverage: number;           // % of items with non-empty value
  examples: any[];            // Sample values
}
```

**Auto-detection Logic:**
```javascript
function analyzeOutput(result) {
  if (!Array.isArray(result)) {
    return { type: 'primitive', isStructured: false, itemCount: 0 };
  }
  
  if (result.length === 0) {
    return { type: 'array', isStructured: false, itemCount: 0 };
  }
  
  // Check if all items are objects with similar structure
  const allObjects = result.every(item => 
    item && typeof item === 'object' && !Array.isArray(item)
  );
  
  if (!allObjects) {
    return { type: 'array', isStructured: false, itemCount: result.length };
  }
  
  // Detect fields across all items
  const fieldMap = new Map();
  result.forEach(item => {
    Object.entries(item).forEach(([key, value]) => {
      if (!fieldMap.has(key)) {
        fieldMap.set(key, { 
          name: key, 
          examples: [], 
          populatedCount: 0,
          types: new Set()
        });
      }
      
      const field = fieldMap.get(key);
      if (value && String(value).trim()) {
        field.populatedCount++;
        field.examples.push(value);
        field.types.add(detectType(value));
      }
    });
  });
  
  const fields = Array.from(fieldMap.values()).map(f => ({
    name: f.name,
    type: Array.from(f.types)[0] || 'string',
    required: f.populatedCount > result.length * 0.7, // >70% populated
    coverage: Math.round((f.populatedCount / result.length) * 100),
    examples: f.examples.slice(0, 3)
  }));
  
  return {
    type: 'array',
    isStructured: true,
    fields,
    itemCount: result.length
  };
}
```

### 3. Field-Level Feedback UI (Universal)

Generate feedback UI dynamically based on output analysis:

```javascript
function renderFieldTable(items, analysis) {
  if (!analysis.isStructured) {
    return renderRawOutput(items);
  }
  
  return `
    <table>
      <thead>
        <tr>
          <th>#</th>
          ${analysis.fields.map(field => `
            <th>
              ${field.name}
              ${field.coverage < 50 ? `
                <button class="fix-field-btn" data-field="${field.name}">
                  Fix
                </button>
              ` : ''}
              <span class="coverage-badge">${field.coverage}%</span>
            </th>
          `).join('')}
        </tr>
      </thead>
      <tbody>
        ${items.slice(0, 20).map((item, idx) => `
          <tr>
            <td>${idx + 1}</td>
            ${analysis.fields.map(field => {
              const value = item[field.name];
              const isEmpty = !value || String(value).trim() === '';
              return `
                <td class="${isEmpty ? 'empty' : 'populated'}">
                  ${isEmpty ? '(empty)' : escapeHtml(String(value).substring(0, 100))}
                </td>
              `;
            }).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}
```

### 4. Feedback Collection (Structured)

```typescript
interface FieldFeedback {
  field: string;
  issue: 'missing' | 'wrong' | 'partial' | 'format';
  correctValue?: string;        // For simple corrections
  correctSelector?: string;     // For scraper fields
  correctExpression?: string;   // For data transformation fields
  notes?: string;               // Human guidance for agent
  examples?: Array<{            // Expected output examples
    input: any;
    expectedOutput: any;
  }>;
}
```

**Feedback Modal Template:**
```html
<div class="feedback-modal">
  <h3>Fix Field: "${fieldName}"</h3>
  
  <div class="current-status">
    <strong>Coverage:</strong> ${coverage}% (${populatedCount}/${totalCount})
    <strong>Current Logic:</strong> <code>${extractedLogic}</code>
  </div>
  
  <label>
    What's the issue?
    <select name="issue">
      <option value="missing">No data extracted</option>
      <option value="wrong">Wrong data extracted</option>
      <option value="partial">Inconsistent results</option>
      <option value="format">Wrong format</option>
    </select>
  </label>
  
  <!-- Dynamic based on agent type -->
  ${agentType === 'scraper' ? `
    <label>
      Correct CSS Selector:
      <input type="text" name="correctSelector" />
    </label>
  ` : ''}
  
  ${agentType === 'transformer' ? `
    <label>
      Correct Expression/Logic:
      <textarea name="correctExpression"></textarea>
    </label>
  ` : ''}
  
  <label>
    Guidance Notes:
    <textarea name="notes" placeholder="Describe what the field should contain..."></textarea>
  </label>
  
  <label>
    Expected Examples:
    <div id="examples-container"></div>
    <button type="button" id="add-example">+ Add Example</button>
  </label>
</div>
```

### 5. Refinement Endpoint (Generic)

```typescript
app.post('/refine-agent', async (req, res) => {
  const {
    agentType,          // 'scraper' | 'transformer' | 'analyzer' | etc.
    originalCode,       // Current code
    outputAnalysis,     // Field definitions from auto-detection
    feedback,           // Array of FieldFeedback
    testContext         // URL, sample data, etc.
  } = req.body;
  
  res.setHeader('Content-Type', 'text/event-stream');
  
  try {
    // Build refinement prompt based on agent type and feedback
    const prompt = buildRefinementPrompt({
      agentType,
      originalCode,
      outputAnalysis,
      feedback,
      testContext
    });
    
    // Stream agent iterations
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      sendSSE(res, { type: 'info', message: `Refinement attempt ${attempt}/${MAX_ATTEMPTS}` });
      
      // Generate improved code
      const improvedCode = await generateCodeWithFeedback(prompt, feedback);
      
      sendSSE(res, { type: 'info', message: 'Testing improved code...' });
      
      // Test the code
      const testResult = await executeCode({
        code: improvedCode,
        ...testContext
      });
      
      // Analyze if feedback issues were resolved
      const resolved = checkFeedbackResolution(testResult, feedback);
      
      if (resolved.allFixed) {
        sendSSE(res, {
          type: 'complete',
          output: improvedCode,
          resolved: resolved.fixed,
          remaining: [],
          analysis: analyzeOutput(testResult.items)
        });
        return;
      }
      
      // Update feedback for next iteration
      feedback = feedback.filter(f => !resolved.fixed.includes(f.field));
      sendSSE(res, {
        type: 'progress',
        message: `Fixed ${resolved.fixed.length} fields, ${resolved.remaining.length} remaining`,
        fixed: resolved.fixed,
        remaining: resolved.remaining
      });
    }
    
    // Max attempts reached
    sendSSE(res, {
      type: 'complete',
      output: improvedCode,
      partialSuccess: true,
      resolved: resolved.fixed,
      remaining: resolved.remaining
    });
    
  } catch (error) {
    sendSSE(res, { type: 'error', error: error.message });
  } finally {
    res.end();
  }
});
```

### 6. Refinement Prompt Builder (Type-Specific)

```typescript
function buildRefinementPrompt({ agentType, originalCode, outputAnalysis, feedback, testContext }) {
  const basePrompt = `
You are refining ${agentType} code based on user feedback.

CURRENT CODE:
\`\`\`javascript
${originalCode}
\`\`\`

OUTPUT ANALYSIS:
- Total items: ${outputAnalysis.itemCount}
- Fields detected: ${outputAnalysis.fields.map(f => `${f.name} (${f.coverage}% populated)`).join(', ')}

USER FEEDBACK:
${feedback.map(f => `
- Field "${f.field}": ${f.issue}
  ${f.notes ? `Notes: ${f.notes}` : ''}
  ${f.correctSelector ? `Correct selector: ${f.correctSelector}` : ''}
  ${f.correctExpression ? `Correct expression: ${f.correctExpression}` : ''}
  ${f.examples ? `Expected: ${JSON.stringify(f.examples)}` : ''}
`).join('\n')}
`;

  // Add agent-type-specific instructions
  if (agentType === 'scraper') {
    return basePrompt + `
TEST URL: ${testContext.url}

INSTRUCTIONS:
For each feedback item:
1. If correctSelector provided: Use that selector directly
2. If notes provided: Analyze the HTML structure and find elements matching the description
3. Update the field extraction logic in the code
4. Ensure selectors are specific enough to avoid false positives

Return the complete improved scraper code that fixes the feedback issues.
`;
  }
  
  if (agentType === 'transformer') {
    return basePrompt + `
SAMPLE INPUT: ${JSON.stringify(testContext.sampleInput, null, 2)}

INSTRUCTIONS:
For each feedback item:
1. If correctExpression provided: Use that transformation logic
2. If examples provided: Match the input→output pattern
3. Update the transformation logic for that field
4. Test with sample input to verify correctness

Return the complete improved transformer code.
`;
  }
  
  if (agentType === 'analyzer') {
    return basePrompt + `
ANALYSIS CONTEXT: ${testContext.context}

INSTRUCTIONS:
For each feedback item:
1. If examples provided: Match the expected analysis pattern
2. If notes provided: Adjust analysis criteria accordingly
3. Update the analysis logic for that field

Return the complete improved analyzer code.
`;
  }
  
  return basePrompt;
}
```

## Implementation Guide

### Step 1: Add Output Analysis to Execute Server

```typescript
// In execute-server.ts after successful execution
const result = await exportedFunc(...args);

// Analyze output structure
const analysis = analyzeOutput(result);

res.end(JSON.stringify({
  success: true,
  items: Array.isArray(result) ? result : [result],
  result: result,
  analysis: analysis,  // Add this
  logs: logs,
  duration: duration
}));
```

### Step 2: Update Frontend to Use Analysis

```javascript
// In IAFWorkflowBuilder.js
async executeGeneratedScraper() {
  const response = await fetch('http://localhost:3002/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, url })
  });
  
  const result = await response.json();
  
  if (result.success) {
    this.lastResult = {
      code: code,
      url: url,
      items: result.items,
      analysis: result.analysis,  // Store analysis
      agentType: this.testResult?.data?.agentType || 'scraper'
    };
    
    // Render field table based on analysis
    outputContent.innerHTML = this.renderFieldTable(
      result.items,
      result.analysis
    );
  }
}
```

### Step 3: Make Feedback Modal Agent-Agnostic

```javascript
showFieldFeedbackModal(field) {
  const fieldDef = this.lastResult.analysis.fields.find(f => f.name === field);
  const agentType = this.lastResult.agentType;
  
  // Extract current logic for this field from code
  const currentLogic = this.extractFieldLogic(field, this.lastResult.code, agentType);
  
  const modal = document.createElement('div');
  modal.innerHTML = `
    <h2>Fix Field: "${field}"</h2>
    
    <div class="field-info">
      <strong>Coverage:</strong> ${fieldDef.coverage}%
      <strong>Type:</strong> ${fieldDef.type}
      <strong>Current Logic:</strong>
      <code>${currentLogic || '(auto-generated)'}</code>
    </div>
    
    <!-- Dynamic feedback fields based on agent type -->
    ${this.renderAgentSpecificFeedbackFields(agentType, field)}
    
    <!-- Universal feedback fields -->
    <label>
      Issue Type:
      <select name="issue">
        <option value="missing">No data extracted</option>
        <option value="wrong">Wrong data</option>
        <option value="partial">Inconsistent</option>
        <option value="format">Wrong format</option>
      </select>
    </label>
    
    <label>
      Guidance Notes:
      <textarea name="notes" placeholder="Describe what this field should contain..."></textarea>
    </label>
  `;
  
  // ... handle submission
}

renderAgentSpecificFeedbackFields(agentType, field) {
  if (agentType === 'scraper') {
    return `
      <label>
        Correct CSS Selector:
        <input type="text" name="correctSelector" placeholder=".element .selector" />
        <small>Use browser DevTools to find the right selector</small>
      </label>
    `;
  }
  
  if (agentType === 'transformer') {
    return `
      <label>
        Correct Transformation Logic:
        <textarea name="correctExpression" placeholder="x => x.toUpperCase()"></textarea>
      </label>
      
      <label>
        Expected Examples:
        <div id="example-pairs"></div>
        <button type="button" id="add-example">+ Add Example</button>
      </label>
    `;
  }
  
  if (agentType === 'analyzer') {
    return `
      <label>
        Correct Analysis Pattern:
        <textarea name="correctPattern" placeholder="Describe the pattern to detect..."></textarea>
      </label>
    `;
  }
  
  return '';
}
```

### Step 4: Universal Refinement Endpoint

```typescript
// In langchain-server.ts
app.post('/refine-agent', async (req, res) => {
  const { agentType, originalCode, outputAnalysis, feedback, testContext } = req.body;
  
  res.setHeader('Content-Type', 'text/event-stream');
  
  // Build type-specific prompt
  const prompt = buildRefinementPrompt({
    agentType,
    originalCode,
    outputAnalysis,
    feedback,
    testContext
  });
  
  // Iterate with agent
  for (let attempt = 1; attempt <= 5; attempt++) {
    const improvedCode = await llm.call(prompt);
    
    // Test the code
    const testResult = await fetch('http://localhost:3002/execute', {
      method: 'POST',
      body: JSON.stringify({
        code: improvedCode,
        ...testContext
      })
    }).then(r => r.json());
    
    // Check if feedback resolved
    const resolved = checkFeedbackResolution(
      testResult.analysis,
      feedback
    );
    
    if (resolved.allFixed) {
      res.write(`data: ${JSON.stringify({
        type: 'complete',
        output: improvedCode,
        analysis: testResult.analysis
      })}\\n\\n`);
      break;
    }
  }
  
  res.end();
});
```

## Benefits of This Architecture

1. **Agent-Agnostic**: Works with any code that produces structured output
2. **Auto-Detection**: No manual field definition needed
3. **Type-Specific Feedback**: Feedback UI adapts to agent type
4. **Iterative Refinement**: Closed loop from feedback → code → testing
5. **Extensible**: Easy to add new agent types with custom feedback fields
6. **Reusable**: Same execution + feedback system for all agents

## Usage Examples

### Web Scraper Agent
```javascript
{ 
  agentType: 'scraper',
  code: '...',
  testContext: { url: 'https://example.com' }
}
// Feedback: CSS selectors, element locations
```

### Data Transformer Agent
```javascript
{
  agentType: 'transformer',
  code: '...',
  testContext: { sampleInput: [...] }
}
// Feedback: Transformation expressions, examples
```

### PDF Analyzer Agent
```javascript
{
  agentType: 'analyzer',
  code: '...',
  testContext: { pdfText: '...', patterns: [...] }
}
// Feedback: Pattern descriptions, expected outputs
```

### API Client Agent
```javascript
{
  agentType: 'api-client',
  code: '...',
  testContext: { endpoint: 'https://api.example.com', auth: {...} }
}
// Feedback: Request parameters, response mappings
```

## Next Steps

1. ✅ Fix execute server field names (code/url support)
2. ⏳ Add output analysis to execute server response
3. ⏳ Update frontend to use analysis for field detection
4. ⏳ Make feedback modal agent-type-aware
5. ⏳ Create universal /refine-agent endpoint
6. ⏳ Add agent type detection/specification to workflows
7. ⏳ Test with multiple agent types
