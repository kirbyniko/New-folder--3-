# Agent Intelligence Improvement Plan

## Executive Summary

**Current Problem:** Agent stops after Step 1 (HTML fetch) instead of completing full scraper workflow (6 steps). Returns incomplete code that extracts nothing.

**Root Cause:** ReAct agent framework considers task "complete" when LLM response doesn't contain another tool call. Agent thinks "fetch HTML, print snippet" = task done.

**Core Issues:**
1. ❌ **No goal awareness** - Agent doesn't know it should extract specific fields
2. ❌ **No output validation** - Doesn't test if scraper returns data
3. ❌ **No self-correction** - Can't identify distance from goal
4. ❌ **No user interaction** - Can't ask for help when stuck
5. ❌ **Config not used** - Field list from JSON config not passed to agent

---

## Current Architecture Analysis

### What Happens Now

```
User clicks "🤖 Use AI Agent"
  ↓
Frontend builds task string with field names
  ↓
POST to /agent endpoint with {task, config}
  ↓
createScraperAgent() creates ReAct agent
  ↓
Agent.invoke() with recursionLimit: 25
  ↓
LLM reads task → decides "I should fetch HTML"
  ↓
Calls execute_code tool: axios.get(url)
  ↓
Gets HTML output (200 lines)
  ↓
LLM reads HTML → generates response WITHOUT tool call
  ↓
ReAct framework: "No tool call = task complete"
  ↓
Returns incomplete code to frontend
  ↓
Frontend shows "✅ Agent built scraper successfully"
  ↓
Code extracts NOTHING (no cheerio parsing, no fields)
```

### Why It Stops Early

**ReAct Agent Stopping Condition:**
```typescript
// LangChain's ReAct agent stops when:
// 1. LLM response contains NO tool call JSON
// 2. OR recursionLimit reached (currently 25)
// 3. OR explicit "FINAL ANSWER:" in response

// Our agent after Step 1:
LLM: "Here's the code: ```javascript const axios = require('axios')...```"
ReAct: "No tool call detected → Task complete"
```

**What's Missing:**
- No explicit goal tracking (must extract N fields)
- No output validation (does code return data?)
- No iteration forcing (MUST call tool at least 3 times)
- No reflection phase (is this actually done?)

---

## What Config Contains (But Agent Ignores)

```json
{
  "dataSourceName": "Honolulu City Council",
  "startUrl": "https://www.honolulu.gov/clerk/clk-council-calendar/",
  "pageStructures": [
    {
      "fields": [
        {"fieldName": "time", "type": "time", "description": "Meeting time"},
        {"fieldName": "date", "type": "date", "description": "Meeting date"},
        {"fieldName": "name", "type": "text", "description": "Event name"}
      ]
    }
  ]
}
```

**Frontend extracts fields:**
```javascript
const fieldList = fields.map(f => f.fieldName).join(', ');
// Result: "time, date, name"
```

**Task sent to agent:**
```
Build a complete JavaScript web scraper for https://...
Extract these fields: time, date, name

COMPLETE workflow (do ALL steps):
1. Use execute_code to fetch HTML and examine structure
2. Find working CSS selectors for each field
...
```

**But agent only sees plain text!** No structured data, no validation criteria, no field schemas.

---

## Intelligence Gaps

### 1. No Goal State Tracking

**Problem:** Agent doesn't know what "done" looks like

**Current:**
```javascript
// Agent has zero awareness of:
- How many fields to extract
- What each field should contain
- Whether extraction succeeded
- If any fields are null/missing
```

**Needed:**
```javascript
goalState = {
  fieldsRequired: ['time', 'date', 'name'],
  fieldsExtracted: [],
  allFieldsHaveData: false,
  confidence: 0,
  status: 'incomplete'
}
```

### 2. No Output Validation

**Problem:** Agent returns code without testing it

**Current:**
```javascript
// Agent flow:
1. Generate code
2. Return code
3. DONE

// No step to:
- Run the code
- Check if it extracts data
- Verify field values aren't null
```

**Needed:**
```javascript
// Validation loop:
1. Generate code
2. Execute code with execute_tool
3. Parse output JSON
4. Check: do all required fields have values?
5. If NO → find better selectors (back to step 1)
6. If YES → return code
```

### 3. No Self-Reflection

**Problem:** Agent can't assess own progress

**Current:**
```
Agent: "I fetched HTML and printed 200 lines"
Agent: *stops*
```

**Needed:**
```
Agent: "I fetched HTML"
Agent: *self-check* "Did I extract the fields? NO"
Agent: *self-check* "What's my distance from goal? 0/3 fields"
Agent: "I need to parse HTML with cheerio"
Agent: *continues*
```

### 4. No User Interaction Protocol

**Problem:** Agent can't ask for help when stuck

**Current:**
```
Agent hits roadblock → gives up OR makes wrong guess
```

**Needed:**
```
Agent analyzes HTML → all fields have class "item-data"
Agent: "Found 47 elements with class 'item-data'"
Agent: "USER INPUT NEEDED: Which element contains meeting time?"
Agent: "Options: [shows 3 examples with data]"
User: "The one with 'PM' in it"
Agent: "Got it, using selector .item-data:contains('PM')"
```

### 5. Config Not Structured for Agent

**Problem:** Field info buried in plain text task string

**Current:**
```javascript
// Agent receives:
task = "Extract these fields: time, date, name\n\nCOMPLETE workflow..."

// Agent sees: just text, no structure
```

**Needed:**
```javascript
// Agent receives structured config:
{
  task: "Build scraper",
  fields: [
    {name: "time", type: "time", required: true, example: "2:00 PM"},
    {name: "date", type: "date", required: true, example: "January 15, 2026"},
    {name: "name", type: "text", required: true, example: "Council Meeting"}
  ],
  targetUrl: "https://...",
  validationCriteria: {
    minItems: 1,
    allFieldsRequired: true,
    allowNull: false
  }
}
```

---

## Proposed Solution Architecture

### Phase 1: Add Goal-Aware Validation Layer

**Wrap ReAct agent with validation loop:**

```typescript
async function intelligentScraperAgent(config) {
  const fields = config.fields; // [{name, type, required}]
  const maxAttempts = 5;
  let attempt = 0;
  
  while (attempt < maxAttempts) {
    attempt++;
    
    // 1. Run agent with enhanced task
    const task = buildEnhancedTask(config, attempt);
    const result = await agent.invoke(task);
    
    // 2. Extract code from result
    const code = extractCode(result.output);
    
    // 3. TEST THE CODE (critical!)
    const testResult = await executeCode(code, config.targetUrl);
    
    // 4. VALIDATE OUTPUT
    const validation = validateOutput(testResult, fields);
    
    if (validation.success) {
      // All fields extracted with data
      return { code, validation, attempts: attempt };
    }
    
    // 5. BUILD FEEDBACK for next iteration
    const feedback = buildFeedback(validation, testResult);
    
    // 6. Check if agent needs user help
    if (validation.needsUserInput) {
      return {
        status: 'needs_input',
        question: validation.question,
        options: validation.options,
        partialCode: code,
        attempts: attempt
      };
    }
    
    // 7. Continue with feedback
    config.previousAttempts.push({
      code,
      result: testResult,
      issues: validation.issues
    });
  }
  
  // Failed after max attempts
  return {
    status: 'failed',
    partialCode: code,
    attempts: maxAttempts,
    askUserForHelp: true
  };
}
```

### Phase 2: Structured Tool with Validation

**Create new tool: `test_scraper`**

```typescript
const testScraperTool = tool(
  async ({ code, targetUrl, fieldsRequired }) => {
    // 1. Execute the code
    const result = await executeCode(code, targetUrl);
    
    if (!result.success) {
      return {
        success: false,
        error: result.error,
        suggestion: "Fix syntax errors in code"
      };
    }
    
    // 2. Parse output as JSON
    let items;
    try {
      items = JSON.parse(result.output);
    } catch (e) {
      return {
        success: false,
        error: "Output is not valid JSON",
        output: result.output.substring(0, 200),
        suggestion: "Use console.log(JSON.stringify(results))"
      };
    }
    
    // 3. Validate field extraction
    const validation = {
      itemCount: items.length,
      fieldsFound: {},
      missingFields: [],
      nullFields: []
    };
    
    fieldsRequired.forEach(field => {
      const hasField = items.every(item => field in item);
      const allNull = items.every(item => !item[field]);
      
      validation.fieldsFound[field] = hasField;
      
      if (!hasField) {
        validation.missingFields.push(field);
      } else if (allNull) {
        validation.nullFields.push(field);
      }
    });
    
    // 4. Determine success
    const allFieldsPresent = validation.missingFields.length === 0;
    const allFieldsHaveData = validation.nullFields.length === 0;
    
    if (allFieldsPresent && allFieldsHaveData) {
      return {
        success: true,
        message: `✅ Extracted ${items.length} items with all ${fieldsRequired.length} fields!`,
        sample: items[0]
      };
    }
    
    // 5. Provide actionable feedback
    let feedback = `❌ Validation failed:\n`;
    feedback += `- Items extracted: ${items.length}\n`;
    
    if (validation.missingFields.length > 0) {
      feedback += `- Missing fields: ${validation.missingFields.join(', ')}\n`;
      feedback += `  → Add these fields to your results object\n`;
    }
    
    if (validation.nullFields.length > 0) {
      feedback += `- Fields with null/empty values: ${validation.nullFields.join(', ')}\n`;
      feedback += `  → Fix selectors for these fields\n`;
      feedback += `  → Sample HTML to inspect:\n${result.htmlSample}\n`;
    }
    
    return {
      success: false,
      validation,
      feedback,
      sampleItem: items[0],
      suggestion: "Use execute_code to inspect HTML and find correct selectors"
    };
  },
  {
    name: "test_scraper",
    description: "Test scraper code and validate it extracts required fields with data",
    schema: z.object({
      code: z.string().describe("Complete scraper code to test"),
      targetUrl: z.string().describe("URL to test against"),
      fieldsRequired: z.array(z.string()).describe("List of field names that must be extracted")
    })
  }
);
```

### Phase 3: Enhanced System Prompt

**Make agent goal-aware:**

```typescript
const systemPrompt = `You are a web scraper expert building production-ready scrapers.

GOAL: Extract ALL required fields with REAL DATA (not null/empty)

REQUIRED FIELDS: ${fields.map(f => f.name).join(', ')}

SUCCESS CRITERIA:
✅ Code runs without errors
✅ Returns array of items (at least 1)
✅ Every item has ALL required fields
✅ NO fields are null/empty/undefined
✅ Field values contain actual text from webpage

YOUR WORKFLOW:
1. execute_code: Fetch HTML and examine first 2000 chars
2. execute_code: Test different selectors to find items container
3. execute_code: Build complete scraper with cheerio
4. test_scraper: Validate scraper extracts all fields
5. IF validation fails → inspect HTML again and fix selectors
6. REPEAT until test_scraper returns success: true

STOPPING RULE:
🚨 Do NOT finish until test_scraper returns success: true
🚨 You MUST call test_scraper after every scraper you build

When stuck (can't find selectors after 3 tries):
- Call request_user_help tool with specific question
- Show 2-3 HTML examples you found
- Ask which element contains the field

CRITICAL:
- Use JavaScript ONLY (no Python)
- Use module.exports = async function(url) {...}
- Use cheerio for HTML parsing
- Always console.log(JSON.stringify(results, null, 2))
- Test EVERY scraper you build with test_scraper tool`;
```

### Phase 4: User Help Request Tool

```typescript
const requestUserHelpTool = tool(
  async ({ question, context, options }) => {
    // This tool pauses agent and asks user for input
    return {
      status: 'waiting_for_user',
      question,
      context,
      options,
      message: "Agent paused - awaiting user response"
    };
  },
  {
    name: "request_user_help",
    description: `Ask user for help when stuck. Use after 3 failed attempts to find selectors.
    Provide specific question with 2-3 concrete options based on HTML you inspected.`,
    schema: z.object({
      question: z.string().describe("Clear, specific question for user"),
      context: z.string().describe("Relevant HTML snippet showing the issue"),
      options: z.array(z.string()).describe("2-4 possible choices user can pick from")
    })
  }
);
```

---

## Implementation Steps (Priority Order)

### CRITICAL (Do First)

**1. Add `test_scraper` tool** ⏱️ 30 min
- Create tool in langchain-agent.ts
- Accepts: code, targetUrl, fieldsRequired
- Returns: validation result with specific failures
- Agent can't finish without this returning success

**2. Pass structured fields to agent** ⏱️ 15 min
- Extract fields from config in langchain-server.ts
- Add to agent tools config: `fieldsRequired: ['time', 'date', 'name']`
- Pass to test_scraper tool

**3. Update system prompt with stopping rule** ⏱️ 10 min
- Add "STOPPING RULE: Do NOT finish until test_scraper succeeds"
- Add "You MUST call test_scraper after building scraper"
- Make goal explicit: "Extract ALL fields with REAL DATA"

### HIGH (Do Next)

**4. Add validation loop wrapper** ⏱️ 45 min
- Wrap agent.invoke() in validation loop
- Auto-test returned code
- If validation fails, call agent again with feedback
- Max 5 attempts before asking user

**5. Add `request_user_help` tool** ⏱️ 30 min
- Tool for agent to ask user specific questions
- Pauses execution, returns to frontend
- Frontend shows question + options
- User selects → agent continues with answer

**6. Frontend: Handle "needs_input" status** ⏱️ 45 min
- Detect when agent asks for help
- Show modal with question + radio buttons
- Send user answer back to agent
- Agent continues from where it left off

### MEDIUM (Improvements)

**7. Add reflection step** ⏱️ 30 min
- After each tool call, agent reflects
- "Did that move me closer to goal?"
- "What's my progress? 1/3 fields extracted"
- "What should I do next?"

**8. Better progress tracking** ⏱️ 20 min
- Frontend shows: "Step 2/6: Testing selectors..."
- Show which fields extracted successfully
- Show validation status live

**9. Context management** ⏱️ 25 min
- Don't repeat full HTML in each iteration
- Store HTML in agent memory
- Reference: "HTML from step 1" instead of reprinting

### LOW (Nice to Have)

**10. Learning system** ⏱️ 60 min
- Save successful selector patterns
- "For government sites, try .calendar-item"
- Learn from failures
- Suggest patterns for similar sites

**11. Parallel selector testing** ⏱️ 30 min
- Try 3 selector candidates simultaneously
- Pick the one that returns most data
- Faster than sequential testing

**12. Smart HTML sampling** ⏱️ 20 min
- Show agent most relevant HTML sections
- Skip headers, footers, navigation
- Focus on content area with items

---

## Expected Behavior After Implementation

### Successful Flow

```
User: Click "🤖 Use AI Agent"

Agent: "Starting scraper build for 3 fields: time, date, name"

[Step 1] execute_code: Fetch HTML
Output: <html>...<div class="event">...</div>...

[Step 2] execute_code: Test selector candidates
Output: Found 12 items with .event selector

[Step 3] execute_code: Build complete scraper
Code: module.exports = async function(url) {...}

[Step 4] test_scraper: Validate extraction
Result: ✅ 12 items, all 3 fields present
BUT: 'time' field is null on all items

[Step 5] execute_code: Inspect time field HTML
Output: Time is in <span class="time">2:00 PM</span>

[Step 6] execute_code: Update scraper with correct selector
Code: time: $(el).find('.time').text().trim()

[Step 7] test_scraper: Validate again
Result: ✅ SUCCESS! 12 items, all fields with data

Agent: "✅ Scraper complete! Extracts 12 items with time, date, name"
Frontend: Shows working code, user clicks "Save & Test"
```

### Flow When Agent Needs Help

```
[Steps 1-5 same as above]

[Step 6] execute_code: Try .time selector
Result: Still null (selector doesn't exist)

[Step 7] execute_code: Try #time selector  
Result: Still null

[Step 8] execute_code: Try [data-time] selector
Result: Still null

[Step 9] request_user_help:
Question: "I can't find the meeting time. Which element contains it?"
Context: Shows 3 HTML examples:
  A: <span class="date-info">January 15</span>
  B: <div class="meta">2:00 PM - 4:00 PM</div>
  C: <p class="desc">Council Meeting</p>

Frontend: Shows modal with radio buttons
User: Selects "B: <div class="meta">..."

Agent: Receives "User selected option B: .meta element"

[Step 10] execute_code: Update scraper using .meta
Code: time: $(el).find('.meta').text().split('-')[0].trim()

[Step 11] test_scraper: Validate
Result: ✅ SUCCESS! Time field now has data

Agent: "✅ Complete! (with 1 user assist)"
```

---

## Success Metrics

**Before Implementation:**
- ❌ Agent stops after 1 tool call
- ❌ Returns code that extracts nothing
- ❌ 0% success rate on first try
- ❌ No way to fix broken scrapers
- ❌ User sees "success" for failed attempts

**After Implementation:**
- ✅ Agent continues until validation passes
- ✅ Returns code that extracts all fields
- ✅ 60%+ success rate on first try (no user help)
- ✅ 90%+ success rate with 1 user interaction
- ✅ User sees real success/failure status

**Metrics to Track:**
1. **Completion Rate:** % of agents that finish all steps
2. **Validation Pass Rate:** % of scrapers that extract all fields
3. **Iterations to Success:** Average tool calls before success
4. **User Help Rate:** % of runs that need user input
5. **Time to Working Scraper:** End-to-end duration

---

## File Changes Required

### 1. `scraper-backend/src/langchain-agent.ts`

**Add test_scraper tool:**
```typescript
// After executeCodeTool definition (line ~70)
const testScraperTool = tool(
  async ({ code, targetUrl, fieldsRequired }) => {
    // Implementation from Phase 2 above
  },
  {
    name: "test_scraper",
    description: "...",
    schema: z.object({...})
  }
);
```

**Add request_user_help tool:**
```typescript
const requestUserHelpTool = tool(
  async ({ question, context, options }) => {
    // Implementation from Phase 4 above
  },
  {
    name: "request_user_help", 
    description: "...",
    schema: z.object({...})
  }
);
```

**Update available tools:**
```typescript
const availableTools = {
  execute_code: executeCodeTool,
  test_scraper: testScraperTool,
  request_user_help: requestUserHelpTool,
  fetch_url: fetchUrlTool,
  // ... existing tools
};
```

**Update system prompt:**
```typescript
// In createScraperAgent(), update finalSystemPrompt
// Use template from Phase 3 above
```

### 2. `scraper-backend/src/langchain-server.ts`

**Update /agent endpoint to pass fields:**
```typescript
// Line ~400, after parsing body
const fields = config.pageStructures?.[0]?.fields || [];
const fieldsRequired = fields.map(f => f.fieldName || f.name);

// Pass to runAgentTask
const result = await runAgentTask(task, {
  ...config,
  fieldsRequired, // NEW
  tools: ['execute_code', 'test_scraper', 'request_user_help']
});
```

**Add validation loop:**
```typescript
// Wrap runAgentTask in validation loop (Phase 1)
const intelligentResult = await intelligentScraperAgent({
  task,
  config,
  fields: fieldsRequired,
  onProgress: (data) => sendSSE(data)
});
```

### 3. `sdk-demo/src/components/ScraperAgentUI.js`

**Handle needs_input status:**
```typescript
// In generateWithAgent(), after parsing SSE
if (data.type === 'needs_input') {
  // Show modal with question + options
  const answer = await this.showUserHelpModal(
    data.question,
    data.context,
    data.options
  );
  
  // Send answer back to continue agent
  await this.continueAgentWithUserInput(answer);
}
```

**Add showUserHelpModal:**
```typescript
async showUserHelpModal(question, context, options) {
  // Create modal with radio buttons
  // Return selected option
}
```

### 4. New file: `scraper-backend/src/intelligent-agent-wrapper.ts`

**Validation loop wrapper:**
```typescript
export async function intelligentScraperAgent(config) {
  // Implementation from Phase 1 above
  // Wraps agent.invoke() with validation loop
}
```

---

## Testing Plan

### Unit Tests

```typescript
// test/test-scraper-tool.test.ts
describe('test_scraper tool', () => {
  it('should detect missing fields', async () => {
    const code = 'return [{name: "Meeting"}]'; // missing time, date
    const result = await testScraperTool.invoke({
      code,
      targetUrl: 'https://example.com',
      fieldsRequired: ['time', 'date', 'name']
    });
    expect(result.success).toBe(false);
    expect(result.validation.missingFields).toContain('time');
    expect(result.validation.missingFields).toContain('date');
  });
  
  it('should detect null fields', async () => {
    const code = 'return [{time: null, date: "Jan 1", name: "Meeting"}]';
    const result = await testScraperTool.invoke({...});
    expect(result.success).toBe(false);
    expect(result.validation.nullFields).toContain('time');
  });
  
  it('should pass when all fields have data', async () => {
    const code = 'return [{time: "2:00 PM", date: "Jan 1", name: "Meeting"}]';
    const result = await testScraperTool.invoke({...});
    expect(result.success).toBe(true);
  });
});
```

### Integration Tests

```typescript
// test/intelligent-agent.test.ts
describe('Intelligent Agent', () => {
  it('should complete all steps and return working scraper', async () => {
    const result = await intelligentScraperAgent({
      targetUrl: 'https://example.com/events',
      fields: [{name: 'title'}, {name: 'date'}]
    });
    expect(result.status).toBe('success');
    expect(result.validation.success).toBe(true);
    expect(result.attempts).toBeLessThan(5);
  });
  
  it('should request user help when stuck', async () => {
    // Mock agent that can't find selectors
    const result = await intelligentScraperAgent({...});
    expect(result.status).toBe('needs_input');
    expect(result.question).toContain('Which element');
    expect(result.options.length).toBeGreaterThan(1);
  });
});
```

### Manual Testing Checklist

- [ ] Agent completes simple scraper (1 field, clear HTML)
- [ ] Agent completes complex scraper (3+ fields, nested HTML)
- [ ] Agent requests help when stuck (ambiguous selectors)
- [ ] User help modal displays correctly
- [ ] Agent continues after receiving user input
- [ ] Frontend shows validation status (fields extracted: 2/3)
- [ ] Agent stops after 5 attempts if still failing
- [ ] Error messages are actionable and clear

---

## Rollback Plan

If implementation breaks existing functionality:

1. **Git tag current state:** `git tag before-intelligent-agent`
2. **Feature flag:** `ENABLE_INTELLIGENT_AGENT=false` to use old flow
3. **Gradual rollout:** Enable for 10% of users first
4. **Monitor metrics:** Track completion rate, error rate
5. **Quick revert:** `git revert <commit>` if critical issues

---

## Future Enhancements (Post-MVP)

### Learning System
- Save successful scrapers to database
- Build pattern library: "government sites use .calendar-item"
- Suggest scrapers for similar URLs
- Auto-improve scrapers based on usage data

### Multi-Agent System
- Specialist agents: HTML Inspector, Selector Finder, Validator
- Coordinator agent delegates to specialists
- Parallel execution for faster results

### Advanced User Interaction
- Show agent's "thinking process" in real-time
- Let user edit agent's plan before execution
- Collaborative debugging: user highlights element → agent uses it

### Auto-Maintenance
- Daily scraper health checks
- Auto-fix broken scrapers when HTML changes
- Alert user when scraper needs attention

---

## Document Maintenance

**Last Updated:** January 2, 2026
**Status:** Planning Phase - No changes made yet
**Next Review:** After implementing critical steps 1-3

**Version History:**
- v1.0 (Jan 2, 2026): Initial analysis and plan

**Key Stakeholders:**
- User: Wants working AI agent that doesn't stop early
- Agent: Needs clear goals and validation tools
- System: Requires validation loop and structured config

**Related Documents:**
- `AGENT_INTELLIGENCE_UPGRADE.md` - Previous intelligence features
- `SCRAPER_GUIDE_CORE.md` - Scraper development guide
- `LANGCHAIN_INTEGRATION.md` - LangChain architecture

---

## Summary for Implementation

**Start with 3 critical changes (90 minutes total):**

1. **Add `test_scraper` tool** → Forces validation
2. **Pass `fieldsRequired` array** → Agent knows what to extract  
3. **Update system prompt** → Clear stopping rule

**These 3 changes should solve 80% of the problem.**

Then add user interaction capability:
4. **Add `request_user_help` tool** → Agent can ask questions
5. **Frontend modal for user input** → User provides guidance

**Expected outcome:** Agent that iterates until scraper works, with option to ask user for help when stuck.

**Test with:** Honolulu City Council site (current failing example)
**Success:** Agent returns scraper that extracts all 3 fields (time, date, name) with real data
