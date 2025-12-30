# AI-Powered Scraper Generation Setup Guide

## Overview

The extension now includes **local AI-powered scraper generation** using Ollama. This runs entirely on the user's hardware - no data leaves their machine.

## How It Works

### Multi-Stage AI Analysis Pipeline

1. **Stage 1: Field Analysis**
   - Each captured field is analyzed individually
   - AI determines data type, extraction challenges, parsing needs
   - Keeps context minimal (200 tokens per field)

2. **Stage 2: Step Sequence Analysis**
   - Multi-step captures (click → open modal → capture) are analyzed
   - AI identifies timing, synchronization, failure points
   - Only runs for fields with multi-step interactions

3. **Stage 3: Tool Determination**
   - Based on all analyses, AI selects required npm packages
   - Limited to 5 essential packages
   - Uses JSON output for reliability

4. **Stage 4: Code Generation**
   - Combines all context with relevant tool documentation
   - Generates complete, runnable Node.js scraper
   - Includes error handling, comments, proper structure

### Context Files

The system includes modular context files for common scraping tasks:
- **PDF Parsing**: pdf-parse patterns
- **HTML Parsing**: cheerio best practices  
- **API Requests**: axios/fetch patterns
- **Date Handling**: dayjs formatting
- **Error Handling**: try/catch patterns

Only relevant context is included in prompts to minimize token usage.

## Installation

### 1. Install Ollama

Download from: https://ollama.ai/download

**Windows**: Run installer
**Mac**: `brew install ollama`
**Linux**: `curl -fsSL https://ollama.ai/install.sh | sh`

### 2. Pull Recommended Model

```bash
# Best balance of speed/quality (6.7GB)
ollama pull deepseek-coder:6.7b

# Alternative: Larger, better quality (13GB)
ollama pull codellama:13b

# Alternative: Smaller, faster (4GB)
ollama pull codellama:7b
```

### 3. Start Ollama

```bash
ollama serve
```

The extension will automatically detect when Ollama is running.

## Usage

1. **Build Scraper**: Capture all required fields using the extension
2. **Click "Finish & Export"**: Complete the scraper configuration
3. **Check AI Status**: Modal shows if Ollama is available
4. **Generate Script**: Click "🤖 Generate AI Script"
5. **Wait**: AI analyzes and generates code (30-60 seconds)
6. **Review**: View generated JavaScript code with analysis
7. **Export**: Copy or download the complete scraper

## Generated Script Structure

```javascript
// Required packages determined by AI
const cheerio = require('cheerio');
const axios = require('axios');
const dayjs = require('dayjs');

// Main scraper function
module.exports = async function scrape(url) {
  try {
    // AI-generated scraping logic
    // Based on captured selectors and analysis
    
    return {
      success: true,
      data: {
        // Extracted fields
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};
```

## Model Recommendations

| Model | Size | Speed | Quality | Use Case |
|-------|------|-------|---------|----------|
| `deepseek-coder:6.7b` | 6.7GB | Fast | Excellent | **Recommended** |
| `codellama:13b` | 13GB | Medium | Excellent | High quality |
| `codellama:7b` | 4GB | Very Fast | Good | Quick generation |
| `mistral:7b` | 4GB | Fast | Good | General purpose |

## Architecture Benefits

### ✅ Advantages

1. **Privacy**: All processing happens locally, no API calls
2. **Free**: No API costs, unlimited generations
3. **Fast**: Local inference (10-30 seconds)
4. **Modular**: Break complex tasks into manageable chunks
5. **Extensible**: Easy to add new context files for new tools
6. **Robust**: Multiple stages catch edge cases

### 🎯 Design Decisions

**Why Multiple Stages?**
- Prevents context overflow (8K token limit on smaller models)
- Each stage has focused, specific task
- Results compound for better final output

**Why Local LLM?**
- User controls their data
- No API rate limits
- Works offline
- Free for users

**Why Context Files?**
- Reusable patterns for common tasks
- Reduces prompt engineering burden
- Easily updatable without changing agent code

## Future Enhancements

1. **Mark Steps as "AI Analysis Required"**
   - Add checkbox to template steps
   - Flag complex fields for extra AI attention
   - Generate step-specific prompts

2. **Tool-Specific Context**
   - Add context for: Puppeteer, Playwright, Selenium
   - PDF OCR patterns (Tesseract)
   - Image processing (Sharp)

3. **Iterative Refinement**
   - Test generated script
   - Use errors to refine via AI
   - Multi-pass generation

4. **Custom Prompts**
   - Let users add notes/hints per field
   - Include in AI analysis
   - Domain-specific instructions

## Troubleshooting

### "Local AI not found"
- Ensure Ollama is installed
- Run `ollama serve` in terminal
- Check http://localhost:11434 is accessible

### "Generation failed"
- Check Ollama logs: `ollama logs`
- Ensure model is pulled: `ollama list`
- Try smaller model if running out of memory

### Slow generation
- Use smaller model (7b instead of 13b)
- Close other applications
- Ensure Ollama has enough RAM (8GB+ recommended)

### Poor code quality
- Use larger model (13b or 33b)
- Add more field hints/notes
- Break complex tasks into more steps

## Technical Details

### Token Budget

Per generation (~2000 tokens total):
- Field analysis: ~200 tokens each
- Step analysis: ~200 tokens each  
- Tool determination: ~100 tokens
- Code generation: ~2000 tokens (output)

### Performance

On typical hardware (M1 Mac / Ryzen 5):
- deepseek-coder:6.7b: 20-30 seconds
- codellama:13b: 30-45 seconds
- codellama:7b: 15-20 seconds

### API Endpoint

The extension connects to Ollama at:
```
POST http://localhost:11434/api/generate
```

No authentication required (local only).

## Development

### Adding New Context Files

Edit `ai-agent.js`:

```javascript
this.contextFiles.newTool = `
# New Tool Context

Usage patterns...
Common issues...
Example code...
`;
```

### Adjusting Prompts

Each stage has its own prompt. Modify in `ScraperAIAgent` class:
- `analyzeField()`: Field analysis prompt
- `analyzeStepSequence()`: Multi-step analysis  
- `determineRequiredTools()`: Tool selection
- `generateScraperScript()`: Final code generation

### Testing

1. Create test scraper with extension
2. Click generate
3. Check console for stage-by-stage logs
4. Review generated code quality
5. Test code in Node.js environment

## Resources

- [Ollama Documentation](https://github.com/ollama/ollama)
- [DeepSeek Coder](https://github.com/deepseek-ai/deepseek-coder)
- [CodeLlama](https://ai.meta.com/blog/code-llama-large-language-model-coding/)
