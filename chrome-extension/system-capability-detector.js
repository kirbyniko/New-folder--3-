// System Capability Detector - Detects GPU VRAM and Ollama capabilities

class SystemCapabilityDetector {
  constructor() {
    this.capabilities = {
      ollama: {
        available: false,
        models: [],
        contextLimits: {},
        detectedAt: null
      },
      gpu: {
        detected: false,
        vendor: 'unknown',
        vramMB: 0,
        estimatedVRAM: 0,
        detectedAt: null
      },
      webgpu: {
        available: false,
        maxBufferSize: 0,
        maxComputeWorkgroupStorageSize: 0
      }
    };
  }

  async detectAll() {
    console.log('🔍 Detecting system capabilities...');
    
    await Promise.all([
      this.detectOllama(),
      this.detectGPU(),
      this.detectWebGPU()
    ]);

    console.log('✅ System capabilities detected:', this.capabilities);
    return this.capabilities;
  }

  async detectOllama() {
    try {
      // Check if Ollama is running
      const response = await fetch('http://localhost:11434/api/tags', {
        signal: AbortSignal.timeout(2000)
      });

      if (response.ok) {
        const data = await response.json();
        this.capabilities.ollama.available = true;
        this.capabilities.ollama.models = data.models || [];
        this.capabilities.ollama.detectedAt = new Date().toISOString();

        // Detect context limits per model
        for (const model of this.capabilities.ollama.models) {
          const name = model.name;
          // Known context limits
          if (name.includes('qwen2.5-coder')) {
            this.capabilities.ollama.contextLimits[name] = 32768;
          } else if (name.includes('deepseek-coder-v2:236b')) {
            this.capabilities.ollama.contextLimits[name] = 65536;
          } else if (name.includes('deepseek-coder-v2:16b')) {
            this.capabilities.ollama.contextLimits[name] = 65536;
          } else if (name.includes('deepseek-coder')) {
            this.capabilities.ollama.contextLimits[name] = 16384;
          } else if (name.includes('codellama')) {
            this.capabilities.ollama.contextLimits[name] = 16384;
          } else {
            this.capabilities.ollama.contextLimits[name] = 4096; // Conservative default
          }
        }
        
        // Try to get GPU VRAM info from Ollama's process info
        try {
          const psResponse = await fetch('http://localhost:11434/api/ps', {
            signal: AbortSignal.timeout(2000)
          });
          
          if (psResponse.ok) {
            const psData = await psResponse.json();
            
            // Look for VRAM info in running models
            if (psData.models && psData.models.length > 0) {
              for (const model of psData.models) {
                // Check if model info contains VRAM data
                if (model.size_vram) {
                  const vramBytes = parseInt(model.size_vram);
                  const vramMB = Math.floor(vramBytes / 1024 / 1024);
                  
                  // Estimate total VRAM from model usage
                  // Typically models use 50-80% of available VRAM
                  const estimatedTotalVRAM = Math.floor(vramMB * 1.5);
                  
                  if (!this.capabilities.gpu.detected || this.capabilities.gpu.vendor === 'unknown') {
                    this.capabilities.gpu.detected = true;
                    this.capabilities.gpu.estimatedVRAM = estimatedTotalVRAM;
                    this.capabilities.gpu.vendor = 'ollama-reported';
                    console.log(`✅ GPU VRAM detected from Ollama: ~${Math.floor(estimatedTotalVRAM / 1024)}GB`);
                  }
                }
              }
            }
          }
        } catch (psError) {
          // PS endpoint not available or failed, skip VRAM detection
          console.log('ℹ️ Could not get GPU info from Ollama /api/ps');
        }

        console.log('✅ Ollama detected:', {
          models: this.capabilities.ollama.models.length,
          contextLimits: this.capabilities.ollama.contextLimits
        });
      }
    } catch (error) {
      console.log('ℹ️ Ollama not detected (not running or not installed)');
      this.capabilities.ollama.available = false;
    }
  }

  async detectGPU() {
    try {
      // Check for manual VRAM setting first
      const manualVRAM = localStorage.getItem('manualGPUVRAM');
      if (manualVRAM) {
        const vramMB = parseInt(manualVRAM);
        if (!isNaN(vramMB) && vramMB > 0) {
          this.capabilities.gpu.detected = true;
          this.capabilities.gpu.estimatedVRAM = vramMB;
          this.capabilities.gpu.vendor = 'manual-override';
          this.capabilities.gpu.detectedAt = new Date().toISOString();
          console.log('✅ GPU VRAM (manual):', `${Math.floor(vramMB / 1024)}GB`);
          return;
        }
      }
      
      // Try to get GPU info from WebGPU
      if ('gpu' in navigator) {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) {
          const info = await adapter.requestAdapterInfo();
          this.capabilities.gpu.detected = true;
          this.capabilities.gpu.vendor = info.vendor || 'unknown';
          this.capabilities.gpu.detectedAt = new Date().toISOString();

          // Try to estimate VRAM from limits
          const limits = adapter.limits;
          const maxBufferSize = limits.maxBufferSize || 0;
          const maxStorageBufferBindingSize = limits.maxStorageBufferBindingSize || 0;
          
          // Improved VRAM estimation using multiple signals
          let estimatedVRAM = 8192; // Default 8GB
          
          // Signal 1: Max buffer size
          if (maxBufferSize >= 4294967296) { // 4GB
            estimatedVRAM = 24576; // 24GB+
          } else if (maxBufferSize >= 2147483648) { // 2GB
            estimatedVRAM = 16384; // 16GB+
          } else if (maxBufferSize >= 1073741824) { // 1GB
            estimatedVRAM = 8192; // 8GB+
          } else if (maxBufferSize >= 536870912) { // 512MB
            estimatedVRAM = 4096; // 4GB+
          }
          
          // Signal 2: Check GPU vendor for common configs
          const vendor = (info.vendor || '').toLowerCase();
          if (vendor.includes('nvidia')) {
            // NVIDIA GPUs - check architecture hints
            const arch = (info.architecture || '').toLowerCase();
            if (arch.includes('ampere') || arch.includes('ada')) {
              estimatedVRAM = Math.max(estimatedVRAM, 12288); // 12GB+ for RTX 30xx/40xx
            }
          } else if (vendor.includes('amd')) {
            // AMD GPUs - typically 8GB or 16GB
            estimatedVRAM = Math.max(estimatedVRAM, 8192);
          }
          
          this.capabilities.gpu.estimatedVRAM = estimatedVRAM;

          console.log('✅ GPU detected:', {
            vendor: this.capabilities.gpu.vendor,
            estimatedVRAM: `${Math.floor(estimatedVRAM / 1024)}GB`,
            maxBufferSize: `${Math.floor(maxBufferSize / 1024 / 1024)}MB`,
            confidence: maxBufferSize >= 2147483648 ? 'HIGH' : 'LOW'
          });
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not detect GPU:', error);
      // Fallback: assume moderate GPU
      this.capabilities.gpu.estimatedVRAM = 8192; // 8GB default assumption
    }
  }

  async detectWebGPU() {
    try {
      if ('gpu' in navigator) {
        this.capabilities.webgpu.available = true;
        
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) {
          const limits = adapter.limits;
          this.capabilities.webgpu.maxBufferSize = limits.maxBufferSize || 0;
          this.capabilities.webgpu.maxComputeWorkgroupStorageSize = limits.maxComputeWorkgroupStorageSize || 0;
        }
        
        console.log('✅ WebGPU available');
      }
    } catch (error) {
      console.log('ℹ️ WebGPU not available');
      this.capabilities.webgpu.available = false;
    }
  }

  // Get recommended token limits based on detected capabilities
  getRecommendedLimits() {
    const limits = {
      gpu4K: 4096,      // WebGPU inference
      gpuSafe: 2048,    // GPU only, 0% CPU
      balanced: 6144,   // Low CPU usage
      ollama32K: 32768  // Full Ollama context
    };

    // If Ollama is available, recommend based on model context
    if (this.capabilities.ollama.available) {
      const contextLimits = Object.values(this.capabilities.ollama.contextLimits);
      if (contextLimits.length > 0) {
        const maxContext = Math.max(...contextLimits);
        limits.ollama32K = maxContext;
      }
    }

    // Adjust GPU limits based on VRAM
    if (this.capabilities.gpu.estimatedVRAM >= 16384) { // 16GB+
      limits.gpuSafe = 3072; // Can handle more
      limits.balanced = 8192;
    } else if (this.capabilities.gpu.estimatedVRAM >= 8192) { // 8GB+
      limits.gpuSafe = 2048;
      limits.balanced = 6144;
    } else { // < 8GB
      limits.gpuSafe = 1536;
      limits.balanced = 4096;
    }

    return limits;
  }

  // Get user-friendly capability summary
  getSummary() {
    const summary = {
      inference: [],
      contextLimits: {},
      recommendations: []
    };

    // Ollama
    if (this.capabilities.ollama.available) {
      summary.inference.push({
        name: 'Ollama (Local Server)',
        available: true,
        priority: 1,
        maxContext: Math.max(...Object.values(this.capabilities.ollama.contextLimits)),
        models: this.capabilities.ollama.models.length
      });
      summary.recommendations.push('✅ Use Ollama for best quality and context (32K+ tokens)');
    } else {
      summary.inference.push({
        name: 'Ollama (Local Server)',
        available: false,
        priority: 1,
        instructions: 'Install from https://ollama.ai/download'
      });
      summary.recommendations.push('💡 Install Ollama for 8x more context (32K vs 4K)');
    }

    // WebGPU
    if (this.capabilities.webgpu.available) {
      summary.inference.push({
        name: 'WebGPU (Browser Inference)',
        available: true,
        priority: 2,
        maxContext: 4096,
        note: 'Good for privacy, limited context'
      });
    } else {
      summary.inference.push({
        name: 'WebGPU (Browser Inference)',
        available: false,
        priority: 2,
        note: 'Requires modern browser with GPU'
      });
    }

    // GPU VRAM
    if (this.capabilities.gpu.detected) {
      summary.contextLimits.gpuOnly = this.getRecommendedLimits().gpuSafe;
      summary.contextLimits.lowCPU = this.getRecommendedLimits().balanced;
      summary.recommendations.push(
        `🎮 Your GPU (~${this.capabilities.gpu.estimatedVRAM}MB VRAM) can handle ${this.getRecommendedLimits().gpuSafe} tokens GPU-only`
      );
    }

    return summary;
  }
}

// Export for use in extension
if (typeof window !== 'undefined') {
  window.SystemCapabilityDetector = SystemCapabilityDetector;
}
