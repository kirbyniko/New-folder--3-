# Universal Agent SDK - Test Suite

Local integration testing for universal-agent-sdk.

## Setup

```bash
npm install
```

## Run Tests

```bash
# Basic functionality
npm test

# Hardware detection
npm run test:hardware

# All tests
npm test && npm run test:hardware
```

## What's Tested

### test-basic.js
- Agent creation with presets
- Initialization
- Token estimation
- Config updates
- Metrics retrieval

### test-hardware.js
- Hardware capability detection
- Ollama detection
- GPU VRAM detection
- WebGPU availability
- Recommended token limits

## Expected Output

**Basic Tests:**
```
✅ Agent created
✅ Agent initialized
✅ Token estimates retrieved (total: 6144, cpuRisk: low)
✅ Config updated (tokens reduced from 6144 to 800)
✅ Metrics retrieved
✅ ALL BASIC TESTS PASSED
```

**Hardware Tests:**
```
✅ Ollama detected: 8 models, 33K context
✅ GPU detected: nvidia, 24GB VRAM
✅ WebGPU available: 4096MB buffer
✅ Limits: GPU Safe=2048, Balanced=6144, Ollama=32768
✅ ALL HARDWARE TESTS PASSED
```

## Troubleshooting

**"Cannot find module 'universal-agent-sdk'"**
- Run `npm install` in this directory
- Check that `../universal-agent-sdk` exists
- Run `npm run build` in SDK directory first

**Hardware tests show "not available"**
- Ollama: Install from https://ollama.ai
- GPU: Browser-only feature (WebGPU)
- This is normal in Node.js - hardware detection is browser-focused

## Next Steps

After local tests pass:
1. Publish to npm test registry: `cd ../universal-agent-sdk && npm publish --tag beta`
2. Install from npm: `npm install universal-agent-sdk@beta`
3. Test real-world usage
4. Publish stable: `npm publish` (removes beta tag)
