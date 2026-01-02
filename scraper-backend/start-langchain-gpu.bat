@echo off
REM Force Ollama to use 100% GPU - zero CPU usage

REM Set environment variables for GPU-only inference
set OLLAMA_NUM_GPU=999
set OLLAMA_NUM_THREAD=1
set OLLAMA_USE_MMAP=0
set OLLAMA_USE_MLOCK=1
set OLLAMA_F16_KV=1
set OLLAMA_LOW_VRAM=0
set OLLAMA_FLASH_ATTENTION=1

echo Starting LangChain Agent with 100%% GPU acceleration...
echo.
echo GPU Settings:
echo   - GPU Layers: ALL (999)
echo   - CPU Threads: 1 (minimal)
echo   - Memory Mapping: OFF (GPU optimized)
echo   - Memory Lock: ON (faster GPU access)
echo   - Float16 KV: ON (faster inference)
echo   - Flash Attention: ON (efficient)
echo.

npm run langchain
