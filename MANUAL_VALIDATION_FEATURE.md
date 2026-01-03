# Manual Validation & Refinement Feature

**Goal:** After AI generates scraper with partial success, allow user to mark incorrect fields and guide the AI to fix them using CSS selectors from browser extension.

---

## Architecture

```
AI Agent generates scraper (partial success: 3/6 fields)
       ↓
Frontend shows VALIDATION UI:
  - Table with extracted data (16 rows × 6 columns)
  - Each cell has "✓ Correct" or "✗ Mark Wrong" button
  - Columns with missing/empty data highlighted in yellow
       ↓
User clicks "✗ Mark Wrong" on incorrect fields
       ↓
Modal opens:
  - "What's wrong with this field?"
  - Textarea for notes: "This should be the meeting time, not the image alt text"
  - "Paste correct CSS selector" (from browser extension)
  - Input field for selector: ".e-con-inner .meeting-time"
       ↓
User submits feedback
       ↓
Frontend sends to backend: POST /manual-agent-refine
  - Original scraper code
  - Feedback array: [
      { field: 'time', issue: 'wrong data', notes: '...', correctSelector: '...' },
      { field: 'name', issue: 'missing', notes: '...', correctSelector: '...' }
    ]
       ↓
Backend uses feedback to regenerate scraper:
  - Keep fields that were correct
  - Replace selectors for fields with feedback
  - Test new scraper
  - Return refined code
```

---

## UI Components

### 1. Validation Table (after scraper returns)

```jsx
<ValidationTable>
  <thead>
    <tr>
      <th>Row</th>
      <th>time ⚠️</th>  {/* Yellow - missing data */}
      <th>date ✅</th>   {/* Green - has data */}
      <th>name ⚠️</th>
      <th>name-note ⚠️</th>
      <th>agenda_url ✅</th>
      <th>docket_url ✅</th>
    </tr>
  </thead>
  <tbody>
    {items.map((item, idx) => (
      <tr key={idx}>
        <td>{idx + 1}</td>
        <td className="empty">
          {item.time || <em>empty</em>}
          <button onClick={() => markWrong('time', idx)}>✗ Wrong</button>
        </td>
        <td className="has-data">
          {item.date}
          <button onClick={() => markCorrect('date', idx)}>✓ OK</button>
          <button onClick={() => markWrong('date', idx)}>✗ Wrong</button>
        </td>
        {/* ... more fields */}
      </tr>
    ))}
  </tbody>
</ValidationTable>

<div className="actions">
  <button onClick={acceptScraper}>✅ Accept & Use This Scraper</button>
  <button onClick={refineWithFeedback}>🔧 Refine Incorrect Fields</button>
</div>
```

### 2. Field Feedback Modal

```jsx
<FeedbackModal field="time" onSubmit={handleFeedback}>
  <h3>Fix Field: "time"</h3>
  
  <div className="current-status">
    <strong>Current Status:</strong> All rows empty
    <strong>Current Selector:</strong> <code>.time</code>
  </div>
  
  <label>
    What's wrong?
    <select name="issue">
      <option value="missing">No data extracted</option>
      <option value="wrong">Wrong data extracted</option>
      <option value="partial">Some rows correct, some wrong</option>
    </select>
  </label>
  
  <label>
    Notes (optional):
    <textarea 
      placeholder="E.g., 'Should extract meeting time from the date/time block on left side'"
      name="notes"
    />
  </label>
  
  <label>
    Correct CSS Selector (from browser extension):
    <input 
      type="text"
      placeholder="E.g., .e-con-inner .meeting-datetime .time"
      name="correctSelector"
    />
    <small>💡 Use browser extension to find element, copy selector</small>
  </label>
  
  <div className="actions">
    <button type="submit">Submit Feedback</button>
    <button onClick={cancel}>Cancel</button>
  </div>
</FeedbackModal>
```

### 3. Browser Extension Integration

**Option A: Manual Copy/Paste**
- User right-clicks element → "Inspect"
- User copies CSS selector from DevTools
- User pastes into input field

**Option B: Extension Message (if you have Chrome extension)**
```javascript
// In your existing browser extension:
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSelectorForElement') {
    // User clicks element
    const selector = generateOptimalSelector(clickedElement);
    sendResponse({ selector });
  }
});

// In frontend:
chrome.runtime.sendMessage(
  extensionId, 
  { action: 'getSelectorForElement' }, 
  (response) => {
    setSelectorInput(response.selector);
  }
);
```

---

## Backend Implementation

### New Endpoint: `/manual-agent-refine`

```typescript
app.post('/manual-agent-refine', async (req, res) => {
  const { 
    originalCode, 
    url, 
    feedback, // Array of { field, issue, notes, correctSelector }
    fieldsRequired 
  } = req.body;
  
  console.log('🔧 Refining scraper with user feedback');
  console.log('Feedback received for fields:', feedback.map(f => f.field));
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  try {
    // Extract current selectors from original code
    const currentSelectors = extractSelectorsFromCode(originalCode);
    
    // Build new field selectors based on feedback
    const newFieldSelectors: Record<string, string> = {};
    
    for (const field of fieldsRequired) {
      const feedbackForField = feedback.find(f => f.field === field);
      
      if (feedbackForField && feedbackForField.correctSelector) {
        // User provided correct selector - use it!
        console.log(`✅ Using user-provided selector for "${field}": ${feedbackForField.correctSelector}`);
        newFieldSelectors[field] = feedbackForField.correctSelector;
      } else if (feedbackForField && feedbackForField.notes) {
        // User provided notes but no selector - ask Ollama to find it
        console.log(`🤖 Asking Ollama to find selector for "${field}" with notes: ${feedbackForField.notes}`);
        const ollamaSelector = await findSelectorWithGuidance(
          html, 
          field, 
          feedbackForField.notes,
          currentSelectors.container
        );
        newFieldSelectors[field] = ollamaSelector;
      } else {
        // No feedback for this field - keep original selector
        newFieldSelectors[field] = currentSelectors.fields[field] || `.${field}`;
      }
    }
    
    // Build new scraper with updated selectors
    const refinedCode = buildScraperCode(
      url, 
      fieldsRequired, 
      { 
        containerSelector: currentSelectors.container, 
        fields: newFieldSelectors 
      },
      false // Don't quote fields - already handled
    );
    
    res.write(`data: ${JSON.stringify({ 
      type: 'info', 
      message: '🔨 Rebuilding scraper with your corrections...' 
    })}\n\n`);
    
    // Test the refined scraper
    console.log('🧪 Testing refined scraper...');
    const testResult = await axios.post('http://localhost:3002/run', {
      code: refinedCode,
      args: [url]
    });
    
    const testData = testResult.data;
    
    if (!testData.success) {
      throw new Error(testData.error);
    }
    
    const items = testData.result || [];
    console.log(`📊 Refined scraper extracted ${items.length} items`);
    
    // Validate field coverage
    if (items.length > 0) {
      const firstItem = items[0];
      const missingFields = fieldsRequired.filter(field => 
        !firstItem[field] || (typeof firstItem[field] === 'string' && firstItem[field].trim() === '')
      );
      
      const coverage = ((fieldsRequired.length - missingFields.length) / fieldsRequired.length * 100).toFixed(0);
      
      res.write(`data: ${JSON.stringify({ 
        type: 'complete', 
        output: refinedCode,
        validated: missingFields.length === 0,
        itemCount: items.length,
        fieldCoverage: coverage,
        missingFields: missingFields,
        sampleData: items.slice(0, 3) // Send first 3 rows for preview
      })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ 
        type: 'complete', 
        output: refinedCode,
        validated: false,
        error: 'Refined scraper extracted 0 items',
        itemCount: 0
      })}\n\n`);
    }
    
    res.end();
    
  } catch (error: any) {
    console.error('❌ Refinement failed:', error.message);
    res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      message: error.message 
    })}\n\n`);
    res.end();
  }
});
```

### Helper: Find Selector With Guidance

```typescript
async function findSelectorWithGuidance(
  html: string,
  fieldName: string,
  userNotes: string,
  containerSelector: string
): Promise<string> {
  
  const $ = cheerio.load(html);
  const bodySnippet = $('body').html()?.substring(0, 8000) || '';
  
  const prompt = `You are helping fix a web scraper. A user provided feedback about a field that's not extracting correctly.

FIELD NAME: ${fieldName}
CONTAINER: ${containerSelector}
USER'S FEEDBACK: ${userNotes}

HTML STRUCTURE:
${bodySnippet}

Find the correct CSS selector for this field based on the user's description.
The selector should be RELATIVE to the container: ${containerSelector}

Return ONLY the selector (no explanation):
<selector>.your-selector-here</selector>`;

  const response = await axios.post('http://localhost:11434/api/generate', {
    model: 'llama3-groq-tool-use',
    prompt: prompt,
    stream: false,
    temperature: 0.1
  });
  
  const responseText = response.data.response || '';
  const selectorMatch = responseText.match(/<selector>(.*?)<\/selector>/);
  
  if (selectorMatch) {
    return selectorMatch[1].trim();
  }
  
  // Fallback: try to parse from response text
  return `.${fieldName}`;
}
```

---

## Frontend Implementation

### Update ScraperAgentUI.js

```javascript
const [validationMode, setValidationMode] = useState(false);
const [extractedData, setExtractedData] = useState([]);
const [feedback, setFeedback] = useState([]);
const [showFeedbackModal, setShowFeedbackModal] = useState(false);
const [currentField, setCurrentField] = useState(null);

// After AI returns scraper with partial success
useEffect(() => {
  if (response.sampleData && response.sampleData.length > 0) {
    setValidationMode(true);
    setExtractedData(response.sampleData);
  }
}, [response]);

// Validation Table Component
function ValidationTable({ data, fields, onMarkWrong, onAccept, onRefine }) {
  return (
    <div className="validation-panel">
      <h3>📊 Scraped Data Preview (showing 3 of {response.itemCount} items)</h3>
      <p>Field Coverage: {response.fieldCoverage}% ({fields.length - (response.missingFields?.length || 0)}/{fields.length} fields)</p>
      
      <table className="validation-table">
        <thead>
          <tr>
            <th>#</th>
            {fields.map(field => (
              <th key={field} className={isFieldEmpty(data, field) ? 'empty-field' : 'has-data'}>
                {field}
                {isFieldEmpty(data, field) && <span className="warning">⚠️</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => (
            <tr key={idx}>
              <td>{idx + 1}</td>
              {fields.map(field => (
                <td key={field} className={item[field] ? 'has-value' : 'empty-value'}>
                  <div className="cell-content">
                    {item[field] || <em className="empty-text">empty</em>}
                  </div>
                  <div className="cell-actions">
                    {item[field] && (
                      <button 
                        className="btn-small btn-success" 
                        onClick={() => {/* mark correct */}}
                      >
                        ✓
                      </button>
                    )}
                    <button 
                      className="btn-small btn-warning" 
                      onClick={() => onMarkWrong(field)}
                    >
                      ✗
                    </button>
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      
      <div className="validation-actions">
        <button className="btn-success" onClick={onAccept}>
          ✅ Accept & Use This Scraper
        </button>
        <button className="btn-primary" onClick={onRefine} disabled={feedback.length === 0}>
          🔧 Refine with Corrections ({feedback.length} fields marked)
        </button>
      </div>
    </div>
  );
}

// Feedback Modal Component
function FeedbackModal({ field, onSubmit, onClose }) {
  const [issue, setIssue] = useState('missing');
  const [notes, setNotes] = useState('');
  const [selector, setSelector] = useState('');
  
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Fix Field: "{field}"</h3>
        
        <label>
          What's wrong?
          <select value={issue} onChange={e => setIssue(e.target.value)}>
            <option value="missing">No data extracted</option>
            <option value="wrong">Wrong data extracted</option>
            <option value="partial">Some rows correct, some wrong</option>
          </select>
        </label>
        
        <label>
          Notes (describe what this field should contain):
          <textarea 
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="E.g., 'Should extract meeting time from the date/time block on the left side'"
            rows={3}
          />
        </label>
        
        <label>
          Correct CSS Selector (optional - use browser DevTools):
          <input 
            type="text"
            value={selector}
            onChange={e => setSelector(e.target.value)}
            placeholder="E.g., .e-con-inner .meeting-time"
          />
          <small className="help-text">
            💡 Right-click the element in your browser → Inspect → Copy selector
          </small>
        </label>
        
        <div className="modal-actions">
          <button onClick={() => onSubmit({ field, issue, notes, correctSelector: selector })}>
            Submit Feedback
          </button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// Refine handler
async function refineWithFeedback() {
  setLoading(true);
  setGeneratedCode('');
  
  const response = await fetch('http://localhost:3003/manual-agent-refine', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      originalCode: generatedCode,
      url: targetUrl,
      feedback: feedback,
      fieldsRequired: fields
    })
  });
  
  // Handle SSE stream...
}
```

---

## CSS Styles

```css
.validation-panel {
  margin-top: 20px;
  padding: 20px;
  border: 2px solid #4CAF50;
  border-radius: 8px;
}

.validation-table {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
}

.validation-table th {
  background: #f5f5f5;
  padding: 12px;
  text-align: left;
  border-bottom: 2px solid #ddd;
}

.validation-table th.empty-field {
  background: #fff3cd;
}

.validation-table th.has-data {
  background: #d4edda;
}

.validation-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #eee;
}

.validation-table td.empty-value {
  background: #fff3cd;
}

.cell-content {
  margin-bottom: 4px;
  min-height: 20px;
}

.empty-text {
  color: #999;
  font-style: italic;
}

.cell-actions {
  display: flex;
  gap: 4px;
}

.btn-small {
  padding: 2px 8px;
  font-size: 12px;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

.btn-success {
  background: #28a745;
  color: white;
}

.btn-warning {
  background: #ffc107;
  color: black;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 24px;
  border-radius: 8px;
  max-width: 600px;
  width: 90%;
}

.modal-content label {
  display: block;
  margin: 16px 0;
}

.modal-content textarea,
.modal-content input,
.modal-content select {
  width: 100%;
  padding: 8px;
  margin-top: 4px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.help-text {
  display: block;
  color: #666;
  font-size: 12px;
  margin-top: 4px;
}
```

---

## Usage Flow

1. **User clicks AI Agent** → System tries 15 attempts (3 iterations × 5 attempts)
2. **Partial success**: 16 items, 3/6 fields → Shows Validation Table
3. **User reviews data**:
   - ✅ "date" column looks good
   - ✅ "agenda_url" correct
   - ✅ "docket_url" correct
   - ❌ "time" column empty
   - ❌ "name" column empty
   - ❌ "name-note" column empty
4. **User clicks "✗" on "time" column** → Modal opens
5. **User fills feedback**:
   - Issue: "No data extracted"
   - Notes: "Should extract meeting time from the calendar event header"
   - Selector: `.e-con-inner .event-time` (copied from DevTools)
6. **User clicks Submit** → Feedback saved
7. **User repeats for "name" and "name-note"**
8. **User clicks "🔧 Refine with Corrections"**
9. **Backend rebuilds scraper** with user-provided selectors
10. **Backend tests** → Returns refined code
11. **Frontend shows new validation table** with improved results
12. **If satisfied** → User clicks "✅ Accept & Use This Scraper"

---

## Implementation Checklist

- [ ] Backend: Add `/manual-agent-refine` endpoint
- [ ] Backend: Add `findSelectorWithGuidance()` helper
- [ ] Backend: Add `extractSelectorsFromCode()` helper
- [ ] Frontend: Add `ValidationTable` component
- [ ] Frontend: Add `FeedbackModal` component
- [ ] Frontend: Add refinement workflow handlers
- [ ] Frontend: Add CSS styles for validation UI
- [ ] Test: Generate partial scraper → Review → Refine → Verify improvement

---

## Benefits

1. **Human-in-the-loop**: User guides AI when it gets stuck
2. **No wasted work**: Keep correct fields, fix only wrong ones
3. **Browser extension synergy**: Leverage existing CSS selector tool
4. **Iterative improvement**: Can refine multiple times until perfect
5. **Learning opportunity**: System learns from user corrections (future: store patterns)

Ready to implement when you give the go-ahead!
