# Agent Instructions & Environment Guide

## Overview

The Agent Editor now supports **multi-step instructions** and **coding environment configuration**, allowing you to create sophisticated agents that can execute complex workflows with custom execution environments.

## 📋 Multi-Step Instructions

### What are Instructions?

Instructions define a sequence of steps your agent will follow. Each instruction is executed in order, allowing you to break down complex tasks into manageable steps.

### How to Use

1. **Open Agent Editor** tab
2. Click **📋 Instructions** tab in the editor panel
3. Click **+ Add Step** to create a new instruction
4. For each instruction, configure:
   - **Step Name**: Short description (e.g., "Fetch data", "Parse HTML")
   - **Prompt**: Detailed instruction for what the agent should do
   - **Conditional**: Only execute if previous step succeeded
   - **Loop until complete**: Repeat this step until it returns success

### Example: Web Scraping Agent

```
Step 1: Fetch Page
- Name: "Fetch HTML"
- Prompt: "Fetch the HTML content from {url} and return the raw HTML"
- Conditional: No
- Loop: No

Step 2: Extract Data
- Name: "Parse Product Info"
- Prompt: "Extract all product names, prices, and URLs from the HTML. Return as JSON array."
- Conditional: Yes (only if Step 1 succeeded)
- Loop: No

Step 3: Validate
- Name: "Check Data Quality"
- Prompt: "Verify that all products have valid prices and URLs. If any are missing, return error."
- Conditional: Yes
- Loop: Yes (retry until data is valid)
```

### Benefits

- **Clear workflow**: Break complex tasks into steps
- **Error handling**: Conditional execution prevents cascading failures
- **Retry logic**: Loop until complete for unreliable operations
- **Maintainability**: Easy to debug and modify individual steps

## ⚙️ Coding Environment

### What is the Environment Config?

The environment configuration defines how your agent's code will execute, including runtime, dependencies, security settings, and resource limits.

### Configuration Options

#### 1. **Runtime**
Choose the execution environment:
- **Node.js**: JavaScript/TypeScript with npm packages
- **Python**: Python 3.x with pip packages
- **Deno**: Modern JavaScript runtime with URL imports
- **Browser (Puppeteer)**: Full browser automation

#### 2. **Dependencies**
List required packages (one per line):

**Node.js:**
```
axios@1.6.0
cheerio@1.0.0
lodash@4.17.21
```

**Python:**
```
requests==2.31.0
beautifulsoup4==4.12.0
pandas==2.0.0
```

**Deno:**
```
https://deno.land/x/oak@v12.6.1/mod.ts
https://esm.sh/cheerio@1.0.0
```

#### 3. **Sandboxed Execution**
- ✅ **Enabled** (recommended): Code runs in isolated container
- ❌ **Disabled**: Code has full system access (use with caution!)

#### 4. **Timeout**
Maximum execution time in seconds (5-300):
- **30s** (default): Good for most tasks
- **60s**: Complex data processing
- **300s**: Large file operations

#### 5. **Memory Limit**
Maximum RAM allocation:
- **256 MB**: Simple scripts
- **512 MB** (default): Most use cases
- **1 GB**: Data processing
- **2 GB**: Heavy workloads

#### 6. **Environment Variables**
Add key-value pairs for secrets and config:
- `API_KEY`: Your API keys
- `DATABASE_URL`: Connection strings
- `DEBUG`: Enable debug logging

### Example Configurations

#### Web Scraper Agent
```yaml
Runtime: Browser (Puppeteer)
Dependencies:
  - puppeteer@21.0.0
  - cheerio@1.0.0
Sandboxed: Yes
Timeout: 60s
Memory: 512MB
Environment Variables:
  USER_AGENT: Mozilla/5.0...
```

#### Data Analysis Agent
```yaml
Runtime: Python
Dependencies:
  - pandas==2.0.0
  - numpy==1.24.0
  - matplotlib==3.7.0
Sandboxed: Yes
Timeout: 120s
Memory: 1GB
Environment Variables:
  DATA_SOURCE: /path/to/data
```

#### API Integration Agent
```yaml
Runtime: Node.js
Dependencies:
  - axios@1.6.0
  - dotenv@16.0.0
Sandboxed: Yes
Timeout: 30s
Memory: 256MB
Environment Variables:
  API_KEY: sk-...
  API_ENDPOINT: https://api.example.com
```

## 🔄 How Instructions & Environment Work Together

The agent uses **instructions** to define what to do, and **environment** to define how to execute the code:

```
1. Agent reads instruction
2. Agent generates code based on instruction
3. Code executes in configured environment (runtime + dependencies)
4. Result returned to agent
5. If conditional/loop, agent decides next action
6. Move to next instruction
```

## 💡 Best Practices

### Instructions
1. **Keep steps focused**: One clear task per instruction
2. **Use conditionals wisely**: Prevent executing steps when data is missing
3. **Add loops for retry logic**: Network requests, file operations
4. **Order matters**: Ensure dependencies between steps

### Environment
1. **Pin versions**: Always specify exact versions (`axios@1.6.0` not `axios@latest`)
2. **Minimize dependencies**: Only install what you need
3. **Keep sandboxed on**: Disable only if absolutely necessary
4. **Set appropriate timeouts**: Balance safety vs functionality
5. **Use environment variables**: Never hardcode secrets in prompts

## 🚀 Quick Start

### Creating a Multi-Step Agent

1. **Agent Editor** → **📋 Instructions** tab
2. Click **+ Add Step** for each stage of your workflow
3. Fill in step names and prompts
4. Enable conditional/loop as needed
5. Switch to **⚙️ Environment** tab
6. Select runtime and add dependencies
7. Configure resource limits
8. Add any environment variables
9. **Save Agent** to persist configuration
10. Test in **Chat** tab or use in **Workflows**

### Testing Your Agent

1. Switch to **Test Output** tab
2. Click **Test Agent** button
3. Agent executes all instructions in order
4. View results, logs, and any errors
5. Iterate on instructions/environment as needed

## 📊 Example: Complete Agent Config

**Agent Name:** Product Price Tracker

**System Prompt:**
```markdown
You are a product price tracking agent. You scrape e-commerce sites, 
extract product data, and store price history.
```

**Instructions:**
1. **Fetch Product Page**
   - Prompt: "Navigate to {url} and wait for products to load"
   - Conditional: No | Loop: No

2. **Extract Products**
   - Prompt: "Find all product cards and extract name, price, availability"
   - Conditional: Yes | Loop: No

3. **Validate Data**
   - Prompt: "Check that all products have valid prices (not null, not $0.00)"
   - Conditional: Yes | Loop: Yes

4. **Store Results**
   - Prompt: "Save product data to database with timestamp"
   - Conditional: Yes | Loop: No

**Environment:**
- Runtime: Browser (Puppeteer)
- Dependencies: `puppeteer@21.0.0`, `axios@1.6.0`
- Sandboxed: Yes
- Timeout: 60s
- Memory: 512MB
- Variables: `DATABASE_URL=...`, `USER_AGENT=...`

**Tools:** `execute_code`, `fetch_url`

---

## 🎯 Next Steps

- Explore **Templates** with pre-configured instructions
- Combine with **Context Files** for domain knowledge
- Use in **Workflows** for multi-agent orchestration
- Export and share agent configurations

Happy agent building! 🤖
