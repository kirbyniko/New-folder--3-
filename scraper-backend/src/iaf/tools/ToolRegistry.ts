/**
 * ToolRegistry - Dynamic tool registration system
 */

import { z } from 'zod';
import { Tool } from '@langchain/core/tools';

export interface ToolDefinition {
  name: string;
  description: string;
  schema: z.ZodObject<any>;
  execute: (params: any) => Promise<any>;
  dependencies?: string[];
  metadata?: Record<string, any>;
}

export class ToolRegistry {
  private static tools: Map<string, ToolDefinition> = new Map();
  private static langchainTools: Map<string, Tool> = new Map();

  /**
   * Register a new tool
   */
  static register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }

    this.tools.set(tool.name, tool);
    console.log(`✅ Registered tool: ${tool.name}`);
  }

  /**
   * Get a tool definition by name
   */
  static get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * List all registered tools
   */
  static list(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Check if a tool is registered
   */
  static has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Unregister a tool
   */
  static unregister(name: string): boolean {
    this.langchainTools.delete(name);
    return this.tools.delete(name);
  }

  /**
   * Clear all tools (useful for testing)
   */
  static clear(): void {
    this.tools.clear();
    this.langchainTools.clear();
  }

  /**
   * Convert a ToolDefinition to a LangChain Tool
   */
  static createLangChainTool(name: string): Tool {
    // Check if already created
    if (this.langchainTools.has(name)) {
      return this.langchainTools.get(name)!;
    }

    const toolDef = this.tools.get(name);
    if (!toolDef) {
      throw new Error(`Tool not found: ${name}`);
    }

    // Create LangChain tool
    const tool = new Tool({
      name: toolDef.name,
      description: toolDef.description,
      schema: toolDef.schema,
      func: async (input: any) => {
        try {
          const result = await toolDef.execute(input);
          return typeof result === 'string' ? result : JSON.stringify(result);
        } catch (error: any) {
          return `Error: ${error.message}`;
        }
      }
    });

    this.langchainTools.set(name, tool);
    return tool;
  }

  /**
   * Get multiple LangChain tools by names
   */
  static getLangChainTools(names: string[]): Tool[] {
    return names.map(name => this.createLangChainTool(name));
  }

  /**
   * Execute a tool directly (without LangChain)
   */
  static async execute(name: string, params: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    // Validate params against schema
    const validated = tool.schema.parse(params);
    
    // Execute
    return await tool.execute(validated);
  }

  /**
   * Get tool statistics
   */
  static getStats() {
    const tools = Array.from(this.tools.values());
    return {
      totalTools: tools.length,
      toolNames: tools.map(t => t.name),
      toolsWithDependencies: tools.filter(t => t.dependencies && t.dependencies.length > 0).length
    };
  }

  /**
   * Validate all tool dependencies are registered
   */
  static validateDependencies(): { valid: boolean; missing: string[] } {
    const missing: string[] = [];

    for (const tool of this.tools.values()) {
      if (tool.dependencies) {
        for (const dep of tool.dependencies) {
          if (!this.tools.has(dep)) {
            missing.push(`${tool.name} requires ${dep}`);
          }
        }
      }
    }

    return {
      valid: missing.length === 0,
      missing
    };
  }
}
