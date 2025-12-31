export interface OllamaCapabilities {
  available: boolean;
  models: Array<{ name: string; size?: number }>;
  contextLimits: Record<string, number>;
  detectedAt: string | null;
}

export interface GPUCapabilities {
  detected: boolean;
  vendor: string;
  vramMB: number;
  estimatedVRAM: number;
  detectedAt: string | null;
}

export interface WebGPUCapabilities {
  available: boolean;
  maxBufferSize: number;
  maxComputeWorkgroupStorageSize: number;
}

export interface SystemCapabilities {
  ollama: OllamaCapabilities;
  gpu: GPUCapabilities;
  webgpu: WebGPUCapabilities;
}

export interface RecommendedLimits {
  gpu4K: number;
  gpuSafe: number;
  balanced: number;
  ollama32K: number;
}

export class SystemCapabilityDetector {
  private capabilities: SystemCapabilities;

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

  async detectAll(): Promise<SystemCapabilities> {
    console.log('🔍 Detecting system capabilities...');
    
    await Promise.all([
      this.detectOllama(),
      this.detectGPU(),
      this.detectWebGPU()
    ]);

    console.log('✅ System capabilities detected:', this.capabilities);
    return this.capabilities;
  }

  async detectOllama(): Promise<void> {
    try {
      const response = await fetch('http://localhost:11434/api/tags', {
        signal: AbortSignal.timeout(2000)
      });

      if (response.ok) {
        const data = await response.json();
        this.capabilities.ollama.available = true;
        this.capabilities.ollama.models = data.models || [];
        this.capabilities.ollama.detectedAt = new Date().toISOString();

        for (const model of this.capabilities.ollama.models) {
          const name = model.name;
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
            this.capabilities.ollama.contextLimits[name] = 4096;
          }
        }
        
        try {
          const psResponse = await fetch('http://localhost:11434/api/ps', {
            signal: AbortSignal.timeout(2000)
          });
          
          if (psResponse.ok) {
            const psData = await psResponse.json();
            
            if (psData.models && psData.models.length > 0) {
              for (const model of psData.models) {
                if (model.size_vram) {
                  const vramBytes = parseInt(model.size_vram);
                  const vramMB = Math.floor(vramBytes / 1024 / 1024);
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

  async detectGPU(): Promise<void> {
    try {
      const manualVRAM = typeof localStorage !== 'undefined' ? localStorage.getItem('manualGPUVRAM') : null;
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
      
      if ('gpu' in navigator) {
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (adapter) {
          const info = await adapter.requestAdapterInfo();
          this.capabilities.gpu.detected = true;
          this.capabilities.gpu.vendor = info.vendor || 'unknown';
          this.capabilities.gpu.detectedAt = new Date().toISOString();

          const limits = adapter.limits;
          const maxBufferSize = limits.maxBufferSize || 0;
          
          let estimatedVRAM = 8192;
          
          if (maxBufferSize >= 4294967296) {
            estimatedVRAM = 24576;
          } else if (maxBufferSize >= 2147483648) {
            estimatedVRAM = 16384;
          } else if (maxBufferSize >= 1073741824) {
            estimatedVRAM = 8192;
          } else if (maxBufferSize >= 536870912) {
            estimatedVRAM = 4096;
          }
          
          const vendor = (info.vendor || '').toLowerCase();
          if (vendor.includes('nvidia')) {
            const arch = (info.architecture || '').toLowerCase();
            if (arch.includes('ampere') || arch.includes('ada')) {
              estimatedVRAM = Math.max(estimatedVRAM, 12288);
            }
          } else if (vendor.includes('amd')) {
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
      this.capabilities.gpu.estimatedVRAM = 8192;
    }
  }

  async detectWebGPU(): Promise<void> {
    try {
      if ('gpu' in navigator) {
        this.capabilities.webgpu.available = true;
        
        const adapter = await (navigator as any).gpu.requestAdapter();
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

  getRecommendedLimits(): RecommendedLimits {
    const limits: RecommendedLimits = {
      gpu4K: 4096,
      gpuSafe: 2048,
      balanced: 6144,
      ollama32K: 32768
    };

    if (this.capabilities.ollama.available) {
      const contextLimits = Object.values(this.capabilities.ollama.contextLimits);
      if (contextLimits.length > 0) {
        const maxContext = Math.max(...contextLimits);
        limits.ollama32K = maxContext;
      }
    }

    if (this.capabilities.gpu.estimatedVRAM >= 16384) {
      limits.gpuSafe = 3072;
      limits.balanced = 8192;
    } else if (this.capabilities.gpu.estimatedVRAM >= 8192) {
      limits.gpuSafe = 2048;
      limits.balanced = 6144;
    } else {
      limits.gpuSafe = 1536;
      limits.balanced = 4096;
    }

    return limits;
  }

  getSummary() {
    const summary = {
      inference: [] as any[],
      contextLimits: {} as any,
      recommendations: [] as string[]
    };

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
