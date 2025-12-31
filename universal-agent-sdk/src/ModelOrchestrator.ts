export class ModelOrchestrator {
  private ollamaEndpoint = 'http://127.0.0.1:11434/api/generate';
  private model: string;
  private webgpuAvailable = false;

  constructor(model = 'qwen2.5-coder:32b') {
    this.model = model;
  }

  async execute(prompt: string, options: ExecuteOptions = {}): Promise<string> {
    try {
      return await this.queryOllama(prompt, options);
    } catch (error) {
      if (this.webgpuAvailable) {
        console.log('Ollama failed, trying WebGPU fallback');
        return await this.queryWebGPU(prompt, options);
      }
      throw error;
    }
  }

  private async queryOllama(prompt: string, options: ExecuteOptions): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600000);
    
    try {
      const response = await fetch(this.ollamaEndpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Origin': 'http://127.0.0.1'
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false,
          options: {
            temperature: options.temperature || 0.7,
            num_predict: options.maxTokens || 2000,
            num_ctx: 6144
          }
        })
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Ollama request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.response || '';
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async queryWebGPU(prompt: string, options: ExecuteOptions): Promise<string> {
    throw new Error('WebGPU not implemented in this context');
  }

  setModel(model: string): void {
    this.model = model;
  }

  getModel(): string {
    return this.model;
  }
}

interface ExecuteOptions {
  temperature?: number;
  maxTokens?: number;
  stop?: string[];
}
