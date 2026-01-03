/**
 * IterativeWrapper - Main engine for executing layered attempts
 */

import { WorkflowConfig, ExecutionContext, LayerConfig, AttemptResult } from './types.js';
import { LayerExecutor, LayerExecutionResult } from './LayerExecutor.js';

export interface IterativeWrapperResult {
  success: boolean;
  output: any;
  validated: boolean;
  totalAttempts: number;
  layerResults: LayerExecutionResult[];
  diagnostics: any;
}

export class IterativeWrapper {
  private layerExecutors: Map<string, LayerExecutor> = new Map();

  constructor(private config: WorkflowConfig) {
    // Initialize layer executors
    config.iterativeWrapper.layers.forEach(layerConfig => {
      this.layerExecutors.set(layerConfig.name, new LayerExecutor(layerConfig));
    });
  }

  /**
   * Execute the workflow with all configured layers
   */
  async execute(
    context: ExecutionContext,
    executeAttempt: (
      layerName: string,
      attemptNumber: number,
      context: ExecutionContext,
      previousResults?: LayerExecutionResult[]
    ) => Promise<AttemptResult>
  ): Promise<IterativeWrapperResult> {
    const layerResults: LayerExecutionResult[] = [];
    let totalAttempts = 0;

    // Execute each layer in order
    for (const layerConfig of this.config.iterativeWrapper.layers) {
      const executor = this.layerExecutors.get(layerConfig.name);
      if (!executor) {
        throw new Error(`Layer executor not found: ${layerConfig.name}`);
      }

      // Execute this layer
      const result = await executor.execute(context, async (attemptNum, ctx) => {
        return await executeAttempt(layerConfig.name, attemptNum, ctx, layerResults);
      });

      layerResults.push(result);
      totalAttempts += result.attempts;

      // Check if we should continue or stop
      if (result.success) {
        if (layerConfig.onSuccess === 'return_best') {
          // Success, return immediately
          return this.buildFinalResult(true, result, totalAttempts, layerResults);
        }
        // Otherwise continue to next layer
      } else {
        // Layer failed
        if (layerConfig.onFailure === 'fail') {
          // Hard failure, stop execution
          return this.buildFinalResult(false, result, totalAttempts, layerResults);
        } else if (layerConfig.onFailure === 'return_best') {
          // Return best result from this layer
          return this.buildFinalResult(false, result, totalAttempts, layerResults);
        }
        // Otherwise continue (onFailure === 'escalate' or 'continue')
      }
    }

    // All layers executed
    const lastResult = layerResults[layerResults.length - 1];
    return this.buildFinalResult(lastResult.success, lastResult, totalAttempts, layerResults);
  }

  /**
   * Build the final result object
   */
  private buildFinalResult(
    success: boolean,
    lastResult: LayerExecutionResult,
    totalAttempts: number,
    layerResults: LayerExecutionResult[]
  ): IterativeWrapperResult {
    return {
      success,
      output: lastResult.output,
      validated: lastResult.validated,
      totalAttempts,
      layerResults,
      diagnostics: {
        workflowName: this.config.name,
        totalLayers: this.config.iterativeWrapper.layers.length,
        layersExecuted: layerResults.length,
        totalAttempts,
        layerDiagnostics: layerResults.map(r => r.diagnostics)
      }
    };
  }

  /**
   * Get workflow configuration
   */
  getConfig(): WorkflowConfig {
    return this.config;
  }

  /**
   * Get layer executor by name
   */
  getLayerExecutor(name: string): LayerExecutor | undefined {
    return this.layerExecutors.get(name);
  }
}
