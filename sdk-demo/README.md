# SDK Demo Platform

Interactive web platform to showcase all Universal Agent SDK functionalities.

## Features

### 6 Interactive Tabs

1. **Overview** - Hero section, feature cards, quick start guide
2. **Hardware Detection** - Live hardware detection with Ollama, GPU, WebGPU
3. **Configuration** - Test 4 presets (minimal, balanced, maximum, gpu) with token estimates
4. **Execute Tasks** - Run real AI tasks with the agent
5. **Memory & Learning** - RAG memory, knowledge base, conversation history
6. **Playground** - Interactive console for experimenting with SDK

## Running

```bash
cd sdk-demo
npm install
npm run dev
```

Opens at http://localhost:5173

## Technology

- **Vite** - Fast dev server & build tool
- **Universal Agent SDK** - Linked via `file:../universal-agent-sdk`
- **Vanilla JS** - No frameworks, pure web APIs

## Features Demonstrated

✅ SystemCapabilityDetector - Detect Ollama, GPU, WebGPU
✅ AgentConfigManager - 4 presets with token estimates
✅ UniversalAgent - Initialize, execute tasks, get metrics
✅ Hardware-aware configuration
✅ Real-time token estimation
✅ Performance metrics tracking
✅ Interactive playground with console output

## Build for Production

```bash
npm run build
npm run preview
```

Outputs to `dist/` directory.
