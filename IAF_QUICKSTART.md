# IAF Workflow Builder - Quick Start Guide

## 🚀 Access the Builder

```
http://localhost:5173/iaf-workflow.html
```

## 📝 Create Your First Workflow (5 Minutes)

### Step 1: Create Workflow (30 seconds)
1. Click **"➕ Create New Workflow"**
2. Enter name: "Test Scraper Workflow"
3. Keep default version: "1.0.0"

### Step 2: Add a Layer (1 minute)
1. Go to **"Layers"** tab
2. Click **"➕ Add Layer"**
3. Set:
   - Max Attempts: **3**
   - Strategy: **pattern_detection**
4. Click **"➕ Add Pattern"**, enter: **NO_ITEMS**
5. Click **"➕ Add Pattern"**, enter: **PARSE_ERROR**
6. Leave Success Action: **continue**
7. Leave Failure Action: **escalate**

### Step 3: Configure Agent (1 minute)
1. Go to **"Agent Config"** tab
2. Set Model: **qwen2.5-coder:14b**
3. Set Temperature: **0.5** (move slider to middle)
4. Keep default system prompt

### Step 4: Select Tools (30 seconds)
1. Go to **"Tools"** tab
2. Check these boxes:
   - ✅ execute_code
   - ✅ fetch_url
   - ✅ test_scraper

### Step 5: Add Validation (30 seconds)
1. Go to **"Validation"** tab
2. Check:
   - ✅ field_coverage
   - ✅ item_count

### Step 6: Save (5 seconds)
1. Click **"💾 Save Workflow"** (top right)
2. Wait for confirmation

### Step 7: Test It (2 minutes)
1. Go to **"Test Runner"** tab
2. Select your workflow from dropdown
3. In the input box, paste:
```json
{
  "url": "https://example.com",
  "task": "Extract data"
}
```
4. Click **"▶️ Run Test"**
5. Watch the progress log!

## 🎯 Create Multi-Agent Workflow (10 Minutes)

### Scenario: 3-Agent Pipeline
**Goal**: Code Generator → HTML Fixer → QA Validator

#### Layer 1: Code Generator
- Model: `qwen2.5-coder:14b` (fast code)
- Temperature: 0.3 (deterministic)
- Max Attempts: 3
- Patterns: `SYNTAX_ERROR`, `DEPENDENCY_ERROR`
- Failure Action: **escalate** (go to next agent)

#### Layer 2: HTML Fixer
- Model: `gpt-4` (better HTML understanding)
- Temperature: 0.5 (balanced)
- Max Attempts: 2
- Patterns: `NO_ITEMS`, `PARSE_ERROR`
- Failure Action: **escalate** (go to QA)

#### Layer 3: QA Validator
- Model: `claude-3-opus` (best validation)
- Temperature: 0.2 (precise)
- Max Attempts: 1
- Failure Action: **stop** (final layer)

### How to Build It

1. **Create workflow** with name "Multi-Agent Scraper"

2. **Add 3 layers** (click "➕ Add Layer" 3 times)

3. **Configure each layer**:
   - Change "Max Attempts" for each
   - Set different patterns
   - Set failure actions

4. **In Agent Config tab**, set model for ALL layers:
   - Note: Current UI sets one model for all
   - Future: Per-layer model selection

5. **Select tools**: All three (execute_code, fetch_url, test_scraper)

6. **Save and test!**

## 🔧 Create Custom LLM Tool

### Add GPT-4 as a Tool

1. Go to **"Tool Manager"** tab
2. Click **"➕ Create New Tool"**
3. Keep "LLM Tool" selected
4. Fill in:
   - Name: `gpt4_analyzer`
   - Model: `gpt-4`
   - Endpoint: `https://api.openai.com/v1/chat/completions`
   - Description: "Advanced HTML and data analysis"
5. Click **"Save Tool"**

Now you can use this tool in any workflow!

### Add Custom Code Tool

1. Go to **"Tool Manager"** tab
2. Click **"➕ Create New Tool"**
3. Select **"Custom Tool"**
4. Fill in:
   - Name: `data_cleaner`
   - Description: "Clean and format extracted data"
   - Code:
```javascript
async function execute(context, params) {
  const data = params.data;
  const cleaned = data.map(item => ({
    ...item,
    price: parseFloat(item.price.replace(/[^0-9.]/g, ''))
  }));
  return { success: true, data: cleaned };
}
```
5. Click **"Save Tool"**

## 🎨 UI Navigation

```
┌─────────────────────────────────────────┐
│  📋 Workflows  │  🔧 Tools  │  🧪 Test  │ ← Top tabs
├─────────────────────────────────────────┤
│                                         │
│  Content changes based on selected tab  │
│                                         │
└─────────────────────────────────────────┘
```

### Workflows Tab
- View all workflows
- Create new
- Edit existing
- Delete workflows

### Tool Manager Tab
- See all tools (builtin + custom)
- Create LLM tools
- Create custom code tools
- Edit/delete custom tools

### Test Runner Tab
- Select workflow to test
- Enter test input (JSON)
- Run and watch progress
- See results in real-time

## 🔍 Reading Progress Logs

```
[Time] Status Message
```

**Status Icons:**
- ℹ️ = Info (blue) - General information
- ✅ = Success (green) - Operation succeeded
- ❌ = Error (red) - Operation failed
- ⚠️ = Warning (yellow) - Potential issue

**Example Log:**
```
[10:23:45] ℹ️  Starting workflow execution...
[10:23:46] ℹ️  Layer 0, Attempt 1: Executing...
[10:23:47] ✅ Layer 0, Attempt 1: Success (score: 87)
[10:23:48] ❌ Layer 1, Attempt 1: Pattern: NO_ITEMS
[10:23:49] ℹ️  Layer 1, Attempt 2: Applying fix...
[10:23:50] ✅ Layer 1, Attempt 2: Success (score: 92)
[10:23:50] ✅ Workflow complete! Final score: 92
```

## 💡 Pro Tips

### Tip 1: Start Simple
- Begin with 1 layer
- Add 1-2 patterns
- Test thoroughly
- Then add more layers

### Tip 2: Use Descriptive Names
- ❌ Bad: "Workflow 1", "Tool A"
- ✅ Good: "Product Scraper with HTML Fix", "GPT-4 Validator"

### Tip 3: Test Often
- Test after each change
- Use realistic input data
- Watch for patterns in failures
- Adjust attempts/strategies based on results

### Tip 4: Pattern Strategy
- Start with **pattern_detection** (better for known errors)
- Use **progressive_refinement** for gradual improvement
- Combine both in multi-layer workflows

### Tip 5: Temperature Guide
- **0.0-0.3**: Deterministic, repeatable (code generation)
- **0.4-0.7**: Balanced (general tasks)
- **0.8-1.2**: Creative (content generation)
- **1.3-2.0**: Very creative (brainstorming)

### Tip 6: Tool Selection
- Only select tools you need (less confusion for agent)
- `execute_code` - For testing code locally
- `fetch_url` - For analyzing HTML/data
- `test_scraper` - For validating scraper output

### Tip 7: Multi-Agent Design
- **Layer 1**: Fast model, simple task
- **Layer 2**: Smarter model, harder task
- **Layer 3**: Best model, validation/QA
- Each layer = safety net for previous one

## 🐛 Common Issues

### "API not ready"
**Fix**: Backend server not running
```powershell
cd scraper-backend
npm run langchain
```

### "No workflows found"
**Fix**: Create your first workflow!
- Click "Create New Workflow" button

### "Execution failed"
**Fix**: Check if:
- Workflow has at least one layer
- Tools are selected
- Backend server is running on port 3003

### UI looks broken
**Fix**: Hard refresh
- Press `Ctrl + Shift + R`
- Or restart frontend: `npm run dev`

## 📊 Workflow Decision Tree

```
Need simple scraper?
  ├─ YES → 1 layer, pattern_detection, qwen2.5-coder
  └─ NO → Continue...

Need HTML analysis?
  ├─ YES → Add layer 2, gpt-4, fetch_url tool
  └─ NO → Continue...

Need validation?
  ├─ YES → Add layer 3, claude-3-opus, validators
  └─ NO → You're done!

Save → Test → Iterate!
```

## 🎯 Success Checklist

Before saving a workflow:
- ✅ Name is descriptive
- ✅ At least 1 layer configured
- ✅ Max attempts set (usually 2-3)
- ✅ Strategy selected
- ✅ At least 1 tool selected
- ✅ Model configured
- ✅ Temperature set appropriately

Before testing:
- ✅ Workflow saved
- ✅ Backend server running
- ✅ Input JSON is valid
- ✅ Input has required fields

## 📈 Next Steps

Once comfortable:
1. Experiment with different models
2. Create custom tools
3. Add LLM tools (multiple models)
4. Build multi-agent pipelines
5. Share workflows with team

## 🆘 Need Help?

Check documentation:
- `IAF_WORKFLOW_BUILDER_COMPLETE.md` - Complete guide
- `IAF_IMPLEMENTATION_SUMMARY.md` - Technical details
- `IAF_GETTING_STARTED.md` - IAF core concepts

---

**Ready?** Open `http://localhost:5173/iaf-workflow.html` and start building! 🚀
