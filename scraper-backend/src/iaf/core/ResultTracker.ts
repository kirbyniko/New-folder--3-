/**
 * ResultTracker - Tracks best results across all attempts
 */

import { AttemptResult, ValidationResult } from './types.js';

export class ResultTracker {
  private bestResult: AttemptResult | null = null;
  private attempts: AttemptResult[] = [];
  private scores: Map<number, number> = new Map();

  /**
   * Add an attempt result and track if it's the best so far
   */
  addAttempt(attemptNumber: number, result: AttemptResult): void {
    this.attempts.push(result);
    
    // Calculate score based on validation result
    const score = this.calculateScore(result);
    this.scores.set(attemptNumber, score);
    
    // Update best result if this is better
    if (!this.bestResult || score > (this.bestResult.score || 0)) {
      this.bestResult = {
        ...result,
        score,
        metadata: {
          ...result.metadata,
          attemptNumber
        }
      };
    }
  }

  /**
   * Calculate score for an attempt (0-100)
   */
  private calculateScore(result: AttemptResult): number {
    let score = 0;
    
    // Base score for success
    if (result.success) {
      score += 40;
    }
    
    // Score for validation
    if (result.validated) {
      score += 40;
    }
    
    // Additional scoring based on metadata
    if (result.metadata) {
      // If we have item count, add points proportionally
      if (typeof result.metadata.itemCount === 'number') {
        score += Math.min(10, result.metadata.itemCount);
      }
      
      // If we have field coverage, add points
      if (typeof result.metadata.fieldCoverage === 'string') {
        const coverage = parseInt(result.metadata.fieldCoverage);
        score += Math.min(10, coverage / 10);
      }
    }
    
    return Math.min(100, score);
  }

  /**
   * Get the best result found so far
   */
  getBestResult(): AttemptResult | null {
    return this.bestResult;
  }

  /**
   * Get all attempt results
   */
  getAllAttempts(): AttemptResult[] {
    return this.attempts;
  }

  /**
   * Get score for a specific attempt
   */
  getScore(attemptNumber: number): number | undefined {
    return this.scores.get(attemptNumber);
  }

  /**
   * Get diagnostics about all attempts
   */
  getDiagnostics() {
    return {
      totalAttempts: this.attempts.length,
      bestAttemptNumber: this.bestResult?.metadata?.attemptNumber,
      bestScore: this.bestResult?.score,
      allScores: Array.from(this.scores.entries()).map(([attempt, score]) => ({
        attempt,
        score
      })),
      successfulAttempts: this.attempts.filter(a => a.success).length,
      validatedAttempts: this.attempts.filter(a => a.validated).length
    };
  }

  /**
   * Reset tracker for new execution
   */
  reset(): void {
    this.bestResult = null;
    this.attempts = [];
    this.scores.clear();
  }
}
