# 🧠 Agent Learning System

## Overview

The AI agent now has a **persistent learning system** that improves over time by learning from both successes and failures. It can also interact with you during generation for better results.

## Key Features

### 1. 📚 Knowledge Base (Persistent Learning)

The agent automatically records:
- **Success Patterns**: What worked (selectors, tools, extraction patterns)
- **Failure Patterns**: What failed and why (errors, root causes, diagnoses)
- **Domain Knowledge**: Site-specific patterns (e.g., honolulu.gov, court systems)

**Benefits:**
- Learns from past attempts
- Warns you about common issues
- Suggests proven patterns for similar sites
- Improves success rate over time

**View Stats:**
- Click "📚 Knowledge Base" button in Scripts tab
- See success rate, top domains, common issues
- View context library with pre-built patterns

### 2. 📖 Context Library

Pre-built knowledge for common scraping scenarios:

| Context Type | Description | Common Tools |
|-------------|-------------|--------------|
| `court-calendar` | Court calendar scraping | cheerio, axios, dayjs |
| `legislative-bills` | Bill listings | cheerio, axios |
| `meeting-agendas` | Meeting/agenda scraping | cheerio, axios, dayjs |
| `pdf-extraction` | PDF document parsing | axios, pdf-parse |
| `dynamic-content` | JS-rendered pages | puppeteer |

**Auto-Detection:**
- Agent automatically selects the right context based on:
  - Template name (e.g., "Court Calendar")
  - URL patterns (e.g., ".pdf" files)
  - Field names

**Includes:**
- Common selector patterns
- Best practices for that domain
- Example code snippets
- Tool recommendations

### 3. 💬 Interactive Chat Mode

Enable agent to ask for your feedback during generation.

**How to Enable:**
1. Go to Scripts tab
2. Check "Interactive Mode" checkbox
3. Generate a script

**What Happens:**
- Agent asks for feedback when first iteration fails
- You can provide:
  - Manual insights ("The page structure looks different")
  - Alternative approaches ("Try a different method")
  - Skip and let it auto-fix

**Feedback Options:**
- Type custom feedback
- Select from quick options
- Skip to auto-continue

### 4. 🔄 Improved Agentic Loop

The generation process now includes:

```
1. Check Knowledge Base
   ↓
2. Load Relevant Context
   ↓
3. Generate Initial Script (with context hints)
   ↓
4. Test Script
   ↓
5. Diagnose (with past failure patterns)
   ↓
6. [Interactive] Ask for User Feedback
   ↓
7. Fix Script (with context examples + user feedback)
   ↓
8. Re-test (up to 3 iterations)
   ↓
9. Record Success/Failure to Knowledge Base
```

## Usage Guide

### First Time Setup

1. **Generate a few scripts** - Let the agent learn
2. **Review results** - Check knowledge base stats
3. **Enable interactive mode** - For better control on complex sites

### For Best Results

✅ **DO:**
- Let the agent run 2-3 iterations
- Check "Interactive Mode" for new/complex sites
- Review knowledge base periodically
- Keep successful scripts (they train the agent)

❌ **DON'T:**
- Clear knowledge base unless needed (loses learning)
- Skip interactive feedback on first failures
- Generate scripts without testing them (no learning happens)

### Knowledge Base Management

**View Stats:**
```
📚 Knowledge Base Button
├── Total Successes: 15
├── Total Failures: 8
├── Success Rate: 65.2%
├── Domains Known: 5
├── Top Domains: honolulu.gov (3), hawaii.gov (2)
└── Common Issues: "Selector not found", "CSP violation"
```

**Clear Knowledge:**
- Only if patterns are outdated
- Or testing new approaches
- ⚠️ Warning: This deletes ALL learned patterns

## Technical Details

### Storage
- **LocalStorage**: `agentKnowledge` (persists across sessions)
- **Format**: JSON with success/failure arrays
- **Size**: ~50 successes + 100 failures max (auto-pruned)

### Context Templates
Located in `agent-knowledge.js`, each template includes:
- Description
- Common selectors (e.g., `table.calendar`, `div.bill-item`)
- Common patterns (e.g., "Case numbers are XXX-YYYY-NNNNN")
- Recommended tools
- Example code snippets

### Learning Algorithm
1. **Extract patterns** from successful scripts:
   - Tools used (cheerio, puppeteer, etc.)
   - Selectors found (CSS selectors)
   - Code patterns (async/await, iteration, etc.)

2. **Record diagnosis** from failures:
   - Error message
   - Root cause (from AI diagnosis)
   - Attempted approach
   - Recommendations

3. **Build context** for new scripts:
   - Match by domain (exact hostname match)
   - Match by template type (court, bill, agenda, etc.)
   - Find common patterns (appear in 30%+ of cases)
   - Generate warnings (common failure modes)

### Interactive Chat
- **Timeout**: 60 seconds for user response
- **Triggers**: After first test failure (iteration 1)
- **Stored**: Chat history included in generation result
- **Export**: Can export full conversation for debugging

## Examples

### Scenario 1: First Time Scraping a Domain

```
🤖 Starting AI scraper generation...
🧠 Checking knowledge base...
⚠️ Knowledge base warnings: None (new domain)
📊 Analyzing scraper configuration...
📚 Using context: "Court calendar scraping patterns"
✍️ Generating initial script with AI...
✅ Initial script generated
🔄 Starting agentic testing loop...
🔍 Iteration 1/3 - Testing script...
❌ Test failed: Selector not found
💬 [Interactive] Agent asks: "The script failed. Do you have insights?"
📝 User feedback: "The table has class 'schedule' not 'calendar'"
🔧 Attempting to fix script...
✅ Script updated
🔍 Iteration 2/3 - Testing script...
✅ Success! Script extracted 8 fields
🧠 Success pattern saved to knowledge base
```

### Scenario 2: Scraping Similar Domain

```
🤖 Starting AI scraper generation...
🧠 Checking knowledge base...
💡 Recommended patterns found: 3
  - Selector pattern: table.schedule
  - Tool: cheerio, axios, dayjs
⚠️ Knowledge base warnings:
  - Watch out: Past attempts failed due to "Date format inconsistent"
📊 Analyzing scraper configuration...
✍️ Generating initial script with AI...
[Uses learned patterns from similar sites]
✅ Success! Script extracted 8 fields (1 iteration only!)
🧠 Success pattern saved to knowledge base
📊 Knowledge Base: 16 successes, 8 failures (66.7% success rate)
```

## Troubleshooting

### Agent keeps failing on the same site
- Enable **Interactive Mode**
- Provide specific feedback about page structure
- Check if similar sites succeeded (view knowledge base)
- Clear knowledge if old patterns are interfering

### Knowledge base not helping
- Need more training data (generate more scripts)
- Domain might be very different from known patterns
- Check if context template is correct (auto-detected)

### Interactive mode timeout
- Response window is 60 seconds
- Agent auto-continues if no response
- Re-run generation to try again

## Future Enhancements

Potential improvements:
- [ ] Export/import knowledge between users
- [ ] Visual pattern analysis (show what worked)
- [ ] Multi-page learning (pagination patterns)
- [ ] A/B testing (try multiple approaches)
- [ ] Prompt tuning based on success metrics
- [ ] Community knowledge sharing

## Files

- `agent-knowledge.js` - Knowledge base system
- `agent-chat.js` - Interactive chat interface
- `ai-agent.js` - Main agent (uses knowledge + chat)
- `popup-library.js` - UI integration
- `popup.html` - Interactive mode toggle + knowledge viewer
