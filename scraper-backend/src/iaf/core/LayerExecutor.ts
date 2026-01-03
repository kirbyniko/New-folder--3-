/**
 * LayerExecutor - Executes a single layer with attempt tracking
 */

import { LayerConfig, AttemptResult, ExecutionContext, ProgressUpdate } from './types.js';
import { ResultTracker } from './ResultTracker.js';
import { PatternDetector } from './PatternDetector.js';

export interface LayerExecutionResult {
  success: boolean;
  output: any;
  validated: boolean;
  attempts: number;
  bestAttempt: number;
  pattern?: string;
  fixApplied?: string;
  diagnostics: any;
}

export class LayerExecutor {
  private resultTracker: ResultTracker;
  private patternDetector: PatternDetector;

  constructor(private config: LayerConfig) {
    this.resultTracker = new ResultTracker();
    this.patternDetector = new PatternDetector(config.patterns);
  }

  /**
   * Execute this layer with the configured strategy
   */
  async execute(
    context: ExecutionContext,
    executeAttempt: (attemptNumber: number, context: ExecutionContext) => Promise<AttemptResult>
  ): Promise<LayerExecutionResult> {
    this.resultTracker.reset();
    const attempts: AttemptResult[] = [];

    this.reportProgress(context, {
      layer: this.config.name,
      status: 'started',
      message: `Starting layer: ${this.config.name}`
    });

    for (let attemptNum = 1; attemptNum <= this.config.maxAttempts; attemptNum++) {
      this.reportProgress(context, {
        layer: this.config.name,
        attempt: attemptNum,
        status: 'progress',
        message: `Attempt ${attemptNum}/${this.config.maxAttempts}`
      });

      try {
        // Execute the attempt
        const result = await executeAttempt(attemptNum, context);
        attempts.push(result);

        // Track result
        this.resultTracker.addAttempt(attemptNum, result);

        // Check if successful
        if (result.success && result.validated) {
          this.reportProgress(context, {
            layer: this.config.name,
            attempt: attemptNum,
            status: 'completed',
            message: `✅ Success on attempt ${attemptNum}`,
            data: result
          });

          return this.buildResult(true, result, attemptNum, attempts);
        }

        // Detect patterns if failed
        if (!result.success || !result.validated) {
          const detectedPattern = this.patternDetector.detect(result, attempts);
          
          if (detectedPattern) {
            this.reportProgress(context, {
              layer: this.config.name,
              attempt: attemptNum,
              status: 'progress',
              message: `🔍 Pattern detected: ${detectedPattern.pattern} (confidence: ${detectedPattern.confidence})`,
              data: { pattern: detectedPattern }
            });

            // Apply fix if pattern suggests escalation
            if (detectedPattern.escalate && this.config.onFailure === 'escalate') {
              return this.buildResult(
                false,
                this.resultTracker.getBestResult()!,
                attemptNum,
                attempts,
                detectedPattern.pattern,
                detectedPattern.suggestedFix
              );
            }
          }
        }
      } catch (error: any) {
        this.reportProgress(context, {
          layer: this.config.name,
          attempt: attemptNum,
          status: 'failed',
          message: `❌ Attempt ${attemptNum} failed: ${error.message}`
        });

        // Track failed attempt
        const failedResult: AttemptResult = {
          success: false,
          output: null,
          validated: false,
          error: error.message
        };
        attempts.push(failedResult);
        this.resultTracker.addAttempt(attemptNum, failedResult);
      }
    }

    // All attempts exhausted
    const bestResult = this.resultTracker.getBestResult();
    
    if (this.config.onFailure === 'return_best' && bestResult) {
      this.reportProgress(context, {
        layer: this.config.name,
        status: 'completed',
        message: `⚠️ All attempts exhausted. Returning best result from attempt ${bestResult.metadata?.attemptNumber}`
      });

      return this.buildResult(false, bestResult, this.config.maxAttempts, attempts);
    }

    // Complete failure
    this.reportProgress(context, {
      layer: this.config.name,
      status: 'failed',
      message: `❌ Layer failed after ${this.config.maxAttempts} attempts`
    });

    return this.buildResult(false, bestResult || attempts[attempts.length - 1], this.config.maxAttempts, attempts);
  }

  /**
   * Build the final result object
   */
  private buildResult(
    success: boolean,
    result: AttemptResult,
    attempts: number,
    allAttempts: AttemptResult[],
    pattern?: string,
    fixApplied?: string
  ): LayerExecutionResult {
    return {
      success,
      output: result.output,
      validated: result.validated,
      attempts,
      bestAttempt: result.metadata?.attemptNumber || attempts,
      pattern,
      fixApplied,
      diagnostics: {
        ...this.resultTracker.getDiagnostics(),
        layerName: this.config.name,
        strategy: this.config.strategy,
        allAttempts: allAttempts.map((a, i) => ({
          attemptNumber: i + 1,
          success: a.success,
          validated: a.validated,
          error: a.error,
          score: this.resultTracker.getScore(i + 1)
        }))
      }
    };
  }

  /**
   * Report progress to context callback
   */
  private reportProgress(context: ExecutionContext, update: ProgressUpdate): void {
    if (context.onProgress) {
      context.onProgress(update);
    }
  }
}
