# Hierarchical Iteration System Guide

## 📚 Understanding the Two-Level Iteration Architecture

The IAF v2.0 hierarchical system has **TWO levels of iteration** that work together:

### 🔄 Level 1: Agent-Level Iteration (Self-Refinement)
Individual agents can refine their own outputs through iteration

### 🔁 Level 2: Layer-Level Iteration (Error Recovery)
Layers can retry when patterns/errors are detected

---

## 🤖 Agent-Level Iteration (The Inner Loop)

### What It Does
An individual agent can **iterate on its own work** before returning results to the layer.

### When to Use
- **Refinement**: Agent improves its output progressively (e.g., writing, analysis)
- **Validation**: Agent checks its own work and retries if invalid
- **Retry**: Agent retries on transient failures

### How to Configure
1. Go to **Agents Registry** tab
2. Edit an agent
3. Scroll to **"🔄 Agent-Level Iteration"** section
4. Enable checkbox
5. Set max attempts (1-10)
6. Choose strategy:
   - **Retry**: Repeat until success (good for API calls that fail randomly)
   - **Refinement**: Each attempt improves on previous (good for creative tasks)
   - **Validation**: Retry until output passes validation rules

### Example: Self-Refining Writer Agent
```json
{
  "id": "writer-agent",
  "name": "Content Writer",
  "model": "mistral-nemo:12b",
  "systemPrompt": "You are a professional content writer.",
  "iterativeWrapper": {
    "enabled": true,
    "maxAttempts": 3,
    "strategy": "refinement"
  }
}
```

**What happens:**
1. Agent writes first draft
2. Agent reviews its own work
3. Agent improves the draft
4. Agent reviews again
5. Returns final polished version

### Visual Indicator
Agents with iteration enabled show a **🔄** icon in the layer assignment UI.

---

## 🔁 Layer-Level Iteration (The Outer Loop)

### What It Does
The entire layer (all agents in it) can **retry when specific error patterns are detected**.

### When to Use
- **Error Recovery**: Network timeouts, rate limits, temporary failures
- **Quality Control**: Retry entire layer if output doesn't meet standards
- **Progressive Refinement**: Each layer attempt builds on previous

### How to Configure
1. Go to **Layers** tab
2. Select a layer
3. Set **"Max Attempts"** (1-10)
4. Add **"Error Patterns"**:
   - Pattern: The error to detect (e.g., "timeout", "rate limit", "empty result")
   - Fix: What to do (e.g., "Retry with backoff", "Use cached data")

### Example: Scraping Layer with Error Handling
```json
{
  "name": "Web Scraping Layer",
  "agentRefs": ["scraper-agent"],
  "maxAttempts": 5,
  "strategy": "sequential",
  "patterns": [
    {
      "pattern": "connection timeout",
      "fix": "Retry with exponential backoff"
    },
    {
      "pattern": "rate limit exceeded",
      "fix": "Wait 60 seconds and retry"
    },
    {
      "pattern": "empty result",
      "fix": "Try alternative scraping method"
    }
  ]
}
```

**What happens:**
1. Layer runs scraper agent
2. If agent returns "connection timeout" → Layer retries (up to 5 times)
3. If agent returns valid data → Layer succeeds, move to next layer

---

## 🎯 Combining Both Levels (The Power Move)

You can use **both** agent-level AND layer-level iteration together!

### Example: Robust Data Processing Workflow

```json
{
  "version": "2.0.0",
  "agentRegistry": {
    "scraper-agent": {
      "id": "scraper-agent",
      "model": "llama3.2:3b",
      "iterativeWrapper": {
        "enabled": true,
        "maxAttempts": 3,
        "strategy": "retry"  // Agent retries its own API calls
      }
    },
    "validator-agent": {
      "id": "validator-agent",
      "model": "mistral-nemo:12b",
      "iterativeWrapper": {
        "enabled": true,
        "maxAttempts": 2,
        "strategy": "validation"  // Agent validates its own checks
      }
    }
  },
  "iterativeWrapper": {
    "layers": [
      {
        "name": "Scraping Layer",
        "agentRefs": ["scraper-agent"],
        "maxAttempts": 5,  // Layer retries if scraping fails
        "patterns": [
          { "pattern": "timeout", "fix": "Retry" }
        ]
      },
      {
        "name": "Validation Layer",
        "agentRefs": ["validator-agent"],
        "maxAttempts": 3,  // Layer retries if validation finds issues
        "patterns": [
          { "pattern": "incomplete data", "fix": "Return to scraping" }
        ]
      }
    ]
  }
}
```

### Execution Flow
```
┌─────────────────────────────────────────────┐
│ Layer 1: Scraping (max 5 attempts)         │
│   ┌─────────────────────────────────────┐   │
│   │ Scraper Agent (max 3 attempts)     │   │
│   │  - Attempt 1: Timeout               │   │
│   │  - Attempt 2: Timeout               │   │
│   │  - Attempt 3: Success! ✓            │   │
│   └─────────────────────────────────────┘   │
│ → Returns data                              │
└─────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────┐
│ Layer 2: Validation (max 3 attempts)       │
│   ┌─────────────────────────────────────┐   │
│   │ Validator Agent (max 2 attempts)   │   │
│   │  - Attempt 1: Finds missing fields │   │
│   │  - Attempt 2: Validation passes ✓  │   │
│   └─────────────────────────────────────┘   │
│ → Returns: "incomplete data"                │
│ → Layer detects pattern, returns to Layer 1│
└─────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────┐
│ Layer 1: Scraping (attempt 2)              │
│   ┌─────────────────────────────────────┐   │
│   │ Scraper Agent                       │   │
│   │  - Success on first try ✓           │   │
│   └─────────────────────────────────────┘   │
│ → Returns complete data                     │
└─────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────┐
│ Layer 2: Validation (attempt 2)            │
│   ┌─────────────────────────────────────┐   │
│   │ Validator Agent                     │   │
│   │  - All checks pass ✓                │   │
│   └─────────────────────────────────────┘   │
│ → Workflow complete! ✓                      │
└─────────────────────────────────────────────┘
```

---

## 🎨 UI Guide: Where to Configure What

### 🤖 Agents Registry Tab
**Configure agents and their self-iteration:**
- Agent name, model, temperature
- System prompt
- **Tools the agent can use**
- **🔄 Agent-Level Iteration** (enable, attempts, strategy)
- Context configuration
- Metadata (cost, latency, tags)

### 📋 Layers Tab
**Configure workflow layers and error handling:**
- Layer name
- **Agents assigned to this layer** (checkboxes)
- **Execution strategy** (sequential/parallel/consensus)
- **Max Attempts** (for layer retries)
- **Error Patterns** (detect and fix)

### 🔧 Tools Registry Tab
**Configure shared tools:**
- Tool definitions
- Access restrictions (which agents can use which tools)
- Rate limits

---

## 🚀 Quick Start Examples

### Example 1: Simple Agent Without Iteration
```json
{
  "id": "simple-agent",
  "name": "Simple Parser",
  "model": "llama3.2:1b",
  "tools": [...]
  // NO iterativeWrapper - just runs once
}
```

### Example 2: Self-Refining Agent
```json
{
  "id": "writer-agent",
  "name": "Content Writer",
  "model": "mistral-nemo:12b",
  "iterativeWrapper": {
    "enabled": true,
    "maxAttempts": 3,
    "strategy": "refinement"  // Improves output each time
  }
}
```

### Example 3: Layer with Error Recovery
```json
{
  "name": "API Call Layer",
  "agentRefs": ["api-agent"],
  "maxAttempts": 5,
  "patterns": [
    { "pattern": "timeout", "fix": "Retry" },
    { "pattern": "rate limit", "fix": "Wait and retry" }
  ]
}
```

### Example 4: Both Levels Combined
- Agent has `iterativeWrapper` → refines its own work
- Layer has `maxAttempts` + `patterns` → retries on errors
- **Result**: Extremely robust, self-healing workflow

---

## 💡 Best Practices

### Agent-Level Iteration
✅ **Use for:**
- Content generation (writing, summarization)
- Complex analysis that benefits from refinement
- Tasks where quality improves with iteration

❌ **Don't use for:**
- Simple deterministic tasks (parsing, extraction)
- Fast operations (adds latency)
- When first attempt is usually correct

### Layer-Level Iteration
✅ **Use for:**
- Network calls (APIs, web scraping)
- External dependencies that might fail
- Quality gates (validation, checking)

❌ **Don't use for:**
- Tasks that never fail
- When errors should propagate immediately
- When retries won't help (bad credentials)

### Combining Both
✅ **Use when:**
- You need both robustness AND quality
- External calls + complex processing
- High-stakes workflows

❌ **Avoid when:**
- Simple, fast operations
- Low-latency requirements
- Development/testing (too slow)

---

## 🔍 Troubleshooting

### Problem: Agent keeps iterating but not improving
**Solution:** Wrong strategy. Use "retry" for failures, "refinement" for quality.

### Problem: Layer retries forever
**Solution:** Check `maxAttempts`. Also check if error pattern is too broad.

### Problem: Workflow is too slow
**Solution:** Reduce iteration attempts or disable agent-level iteration for simple tasks.

### Problem: Can't see 🔄 icon on agent
**Solution:** Agent doesn't have `iterativeWrapper.enabled: true`. Edit agent to enable it.

### Problem: Don't understand when to use which level
**Solution:**
- **Agent-level**: For improving/refining the agent's OWN output
- **Layer-level**: For retrying when EXTERNAL things go wrong

---

## 📖 Summary

| Feature | Agent-Level (Inner) | Layer-Level (Outer) |
|---------|---------------------|---------------------|
| **Scope** | Single agent's work | Entire layer execution |
| **Purpose** | Refine output quality | Handle errors/retries |
| **Configure In** | Agents Registry tab → Edit Agent | Layers tab → Layer config |
| **Visual Indicator** | 🔄 icon on agent | Max Attempts + Patterns |
| **When to Use** | Quality improvement | Error recovery |
| **Examples** | Writing, analysis | API calls, scraping |

**You can use one, both, or neither** - depending on your needs!

---

## 🎓 Learning Path

1. **Start simple**: Create workflow without any iteration
2. **Add layer-level**: Add error patterns to handle failures
3. **Add agent-level**: Enable iteration on agents that benefit from refinement
4. **Optimize**: Adjust attempts/strategies based on results

The hierarchical system is powerful but optional. Use what you need! 🚀
