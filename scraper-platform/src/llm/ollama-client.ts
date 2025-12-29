/**
 * Ollama client for local LLM inference
 * Requires Ollama running locally: ollama serve
 */

import axios from 'axios';

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  temperature?: number;
  stream?: boolean;
}

export interface OllamaGenerateResponse {
  model: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export class OllamaClient {
  private baseUrl: string;
  private model: string;

  constructor(model: string = 'gemma3:4b', baseUrl: string = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  /**
   * Check if Ollama is running and model is available
   */
  async checkAvailability(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, { timeout: 5000 });
      const models = response.data.models || [];
      return models.some((m: any) => m.name.includes(this.model.split(':')[0]));
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate completion from prompt
   */
  async generate(request: OllamaGenerateRequest): Promise<string> {
    const response = await axios.post<OllamaGenerateResponse>(
      `${this.baseUrl}/api/generate`,
      {
        model: request.model || this.model,
        prompt: request.prompt,
        system: request.system,
        temperature: request.temperature || 0.3,
        stream: false
      },
      { timeout: 120000 } // 2 minute timeout
    );

    return response.data.response;
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`);
      return response.data.models?.map((m: any) => m.name) || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Pull a model from Ollama registry
   */
  async pullModel(modelName: string): Promise<void> {
    await axios.post(`${this.baseUrl}/api/pull`, {
      name: modelName,
      stream: false
    }, { timeout: 600000 }); // 10 minute timeout for download
  }
}

export const ollama = new OllamaClient();
