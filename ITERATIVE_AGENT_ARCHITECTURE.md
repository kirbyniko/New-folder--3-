# Iterative Agent Architecture

## Core Innovation: External Validation Loop

The breakthrough is wrapping the ReAct agent with an **external validation loop** instead of trying to fix the agent's internal behavior.

### Why This Works

**The Problem:**
- ReAct agent stops when LLM response has no tool call
- LLM does step 1 → thinks "done" → returns text → ReAct stops
- Can't force continuation from within ReAct framework
- Prompt engineering alone insufficient for multi-step workflows

**The Solution:**
- Don't fight the framework → wrap it
- Run agent multiple times externally
- Check output after each attempt
- Re-invoke with feedback if incomplete
- Continue until validation passes

### Architecture Layers

```
┌─────────────────────────────────────────┐
│         Frontend (ScraperAgentUI)       │
│  - User clicks "AI Agent"               │
│  - Sends: task + pageStructures         │
│  - Receives: SSE progress stream        │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│    LangChain Server (langchain-server)  │
│  - Extracts fieldsRequired from config  │
│  - Calls: runAgentWithValidation()      │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│   VALIDATION LOOP (validation-loop.ts)  │ ← THE KEY INNOVATION
│                                          │
│  for attempt in 1..maxAttempts:         │
│    if attempt > 1:                      │
│      enhance task with feedback         │
│                                          │
│    result = runAgentTask()              │
│                                          │
│    // Check 1: Did agent call test?     │
│    if not testScraperCalled:            │
│      feedback = "DIDN'T CALL TEST"      │
│      continue                            │
│                                          │
│    // Check 2: Did validation pass?     │
│    if not validationPassed:             │
│      feedback = "VALIDATION FAILED"     │
│      continue                            │
│                                          │
│    return validated result               │
│                                          │
│  return error after max attempts        │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│     ReAct Agent (langchain-agent.ts)    │
│  - Runs one attempt                     │
│  - Tools: execute_code, test_scraper    │
│  - May stop early (that's OK now!)      │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│         Tool Execution Layer            │
│  - test_scraper: validates fields       │
│  - execute_code: runs scrapers          │
│  - request_user_help: asks questions    │
└─────────────────────────────────────────┘
```

### Key Insight

**Don't fix the agent → manage it from above**

The agent doesn't need to be perfect. It just needs to be:
- Runnable multiple times
- Observable (can check its output)
- Steerable (accepts feedback)

The validation loop provides:
- **Persistence:** Keeps trying until success
- **Feedback:** Tells agent what went wrong
- **Validation:** Checks if task actually complete
- **Safety:** Limits attempts to prevent infinite loops

### Feedback Escalation Strategy

Each retry gets stronger feedback:

**Attempt 1:** Normal task
```
Build a scraper for honolulu.gov
Required fields: time, date, name
```

**Attempt 2:** Warning + specific instruction
```
⚠️ PREVIOUS ATTEMPT FAILED
You did NOT call test_scraper to validate!

🎯 YOU MUST:
1. Build complete scraper
2. Call test_scraper with fieldsRequired: ['time', 'date', 'name']
3. Fix any validation errors
4. Repeat until test_scraper returns success: true
```

**Attempt 3:** Validation feedback
```
⚠️ TEST FAILED on attempt 2
Missing fields: time
Null fields: date → selector 'span.date' found nothing

🎯 FIX REQUIRED:
- Add extraction for missing fields
- Fix selectors for null fields
- Call test_scraper again
```

### Why Previous Attempts Failed

**Attempt:** Better prompts
- **Issue:** LLM ignores long instructions
- **Why:** Model (qwen2.5-coder:7b) not trained for complex workflows

**Attempt:** Add test_scraper tool
- **Issue:** Agent has tool but doesn't use it
- **Why:** Stops before reaching that step

**Attempt:** Inject fieldsRequired
- **Issue:** Agent sees requirements but doesn't validate
- **Why:** No enforcement mechanism

**Attempt:** Enhanced context
- **Issue:** Better context doesn't force iteration
- **Why:** ReAct framework stops on text response

### Why External Loop Succeeds

1. **Decoupled from agent behavior:** Agent can stop early, loop continues
2. **Observable validation:** Can check if test_scraper was called
3. **Actionable feedback:** Each retry gets specific instructions
4. **Bounded iteration:** Max attempts prevents infinite loops
5. **Progressive enhancement:** Feedback gets stronger with each failure

### Optimization Opportunities

From here, we can optimize:

**1. Smarter Feedback**
- Parse validation errors → generate targeted fixes
- "Field X null" → "Try selectors: [A, B, C]"
- Learning from previous attempts

**2. Early Success Detection**
- Don't wait for test_scraper if code looks complete
- Parse code → check for all field extractions
- Call test_scraper ourselves if agent forgot

**3. Adaptive Attempts**
- Easy tasks: 2 attempts max
- Complex tasks: 10 attempts allowed
- Based on: field count, site complexity

**4. Model Selection**
- Simple sites: fast small model (qwen2.5-coder:7b)
- Complex sites: larger model (codellama:13b)
- Automatic fallback on repeated failures

**5. Caching & Learning**
- Cache successful patterns per domain
- "honolulu.gov uses <div class='event-item'>"
- Inject domain patterns into task

### Implementation Status

✅ **Completed:**
- validation-loop.ts: External wrapper (105 lines)
- Integration into langchain-server.ts
- Feedback escalation logic
- test_scraper validation tool
- fieldsRequired extraction

🔄 **Current Issue:**
- Agent output format problem
- Returning tool call JSON instead of executing it
- Need to debug validation loop execution

🎯 **Next Steps:**
1. Fix current execution issue
2. Test full validation cycle
3. Add attempt logging to frontend
4. Tune feedback messages based on results
5. Consider model alternatives if needed

## Conclusion

The external validation loop is the architectural breakthrough. It doesn't fight the framework's limitations—it works around them. This pattern can be applied to any agent system where the underlying agent is unreliable or stops early.

**Key Principle:** Wrap unreliable components with reliable orchestration.
