/**
 * Main entry point for the Iterative Agent Framework (IAF)
 */

import { WorkflowConfig, ExecutionContext } from './core/types.js';
import { IterativeWrapper, IterativeWrapperResult } from './core/IterativeWrapper.js';
import { ToolRegistry } from './tools/ToolRegistry.js';
import { ValidatorRegistry } from './validators/ValidatorRegistry.js';
import { registerBuiltInTools } from './tools/builtin/index.js';
import { registerBuiltInValidators } from './validators/builtin.js';
import { IAFWorkflowRunner } from './IAFWorkflowRunner.js';
import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';
import * as path from 'path';

export { IAFWorkflowRunner };

export class IterativeAgentFramework {
  private wrapper: IterativeWrapper;
  private config: WorkflowConfig;

  constructor(config: WorkflowConfig) {
    this.config = config;
    this.wrapper = new IterativeWrapper(config);
  }

  /**
   * Load workflow from YAML file
   */
  static async load(filePath: string): Promise<IterativeAgentFramework> {
    const ext = path.extname(filePath).toLowerCase();
    const content = await fs.readFile(filePath, 'utf-8');
    
    let config: WorkflowConfig;
    if (ext === '.yaml' || ext === '.yml') {
      config = yaml.load(content) as WorkflowConfig;
    } else if (ext === '.json') {
      config = JSON.parse(content);
    } else {
      throw new Error(`Unsupported file format: ${ext}`);
    }

    return new IterativeAgentFramework(config);
  }

  /**
   * Create workflow from programmatic config
   */
  static create(config: WorkflowConfig): IterativeAgentFramework {
    return new IterativeAgentFramework(config);
  }

  /**
   * Initialize IAF with built-in tools and validators
   */
  static initialize(options?: { executeEndpoint?: string }) {
    registerBuiltInTools(options?.executeEndpoint);
    registerBuiltInValidators();
    console.log('✅ IAF initialized with built-in tools and validators');
  }

  /**
   * Get workflow configuration
   */
  getConfig(): WorkflowConfig {
    return this.config;
  }

  /**
   * Get the underlying wrapper
   */
  getWrapper(): IterativeWrapper {
    return this.wrapper;
  }

  /**
   * Get required tools for this workflow
   */
  getRequiredTools(): string[] {
    return this.config.agent.tools;
  }

  /**
   * Validate that all required tools are registered
   */
  validateTools(): { valid: boolean; missing: string[] } {
    const missing = this.config.agent.tools.filter(name => !ToolRegistry.has(name));
    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Get validator name from config
   */
  getValidatorName(): string {
    return this.config.validation.name;
  }

  /**
   * Validate that the validator is registered
   */
  validateValidator(): { valid: boolean; error?: string } {
    const name = this.getValidatorName();
    if (!ValidatorRegistry.has(name)) {
      return {
        valid: false,
        error: `Validator not found: ${name}`
      };
    }
    return { valid: true };
  }

  /**
   * Get framework statistics
   */
  static getStats() {
    return {
      tools: ToolRegistry.getStats(),
      validators: ValidatorRegistry.getStats()
    };
  }
}

// Re-export commonly used classes and functions
export { ToolRegistry } from './tools/ToolRegistry.js';
export { ValidatorRegistry } from './validators/ValidatorRegistry.js';
export { IterativeWrapper } from './core/IterativeWrapper.js';
export { LayerExecutor } from './core/LayerExecutor.js';
export { PatternDetector } from './core/PatternDetector.js';
export { ResultTracker } from './core/ResultTracker.js';
export * from './core/types.js';
