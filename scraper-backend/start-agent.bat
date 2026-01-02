@echo off
echo Starting LangChain Agent Server with GPU...
cd /d "%~dp0"

set OLLAMA_NUM_GPU=999
set OLLAMA_NUM_THREAD=1
set OLLAMA_USE_MMAP=0
set OLLAMA_USE_MLOCK=1
set OLLAMA_F16_KV=1
set OLLAMA_FLASH_ATTENTION=1

echo.
echo GPU Environment Variables Set:
echo OLLAMA_NUM_GPU=%OLLAMA_NUM_GPU%
echo OLLAMA_NUM_THREAD=%OLLAMA_NUM_THREAD%
echo.

npm run agent

pause
