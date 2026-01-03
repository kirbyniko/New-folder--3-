/**
 * PatternDetector - Detects error patterns in attempt results
 */

import { AttemptResult, PatternConfig } from './types.js';

export interface DetectedPattern {
  pattern: string;
  confidence: number;
  suggestedFix: string;
  escalate: boolean;
  evidence: string[];
}

export class PatternDetector {
  private patterns: Map<string, PatternConfig> = new Map();

  constructor(patterns?: PatternConfig[]) {
    if (patterns) {
      patterns.forEach(p => this.registerPattern(p));
    }

    // Register built-in patterns
    this.registerBuiltInPatterns();
  }

  /**
   * Register a pattern configuration
   */
  registerPattern(config: PatternConfig): void {
    this.patterns.set(config.pattern, config);
  }

  /**
   * Register built-in common patterns
   */
  private registerBuiltInPatterns(): void {
    const builtInPatterns: PatternConfig[] = [
      {
        pattern: 'NO_ITEMS',
        fix: 'use_alternative_selectors',
        escalate: true
      },
      {
        pattern: 'PARSE_ERROR',
        fix: 'use_different_parser',
        escalate: true
      },
      {
        pattern: 'PARTIAL_SUCCESS',
        fix: 'refine_missing_fields',
        escalate: false
      },
      {
        pattern: 'TIMEOUT',
        fix: 'increase_timeout',
        escalate: false
      },
      {
        pattern: 'NETWORK_ERROR',
        fix: 'retry_with_backoff',
        escalate: false
      },
      {
        pattern: 'INVALID_SELECTOR',
        fix: 'regenerate_selectors',
        escalate: true
      }
    ];

    builtInPatterns.forEach(p => {
      if (!this.patterns.has(p.pattern)) {
        this.patterns.set(p.pattern, p);
      }
    });
  }

  /**
   * Detect patterns in an attempt result
   */
  detect(result: AttemptResult, previousAttempts: AttemptResult[]): DetectedPattern | null {
    const evidence: string[] = [];

    // Check for NO_ITEMS pattern
    if (result.metadata?.itemCount === 0) {
      evidence.push('Zero items extracted');
      return this.createDetectedPattern('NO_ITEMS', 0.9, evidence);
    }

    // Check for PARTIAL_SUCCESS pattern
    if (result.validated === false && result.metadata?.itemCount > 0) {
      evidence.push(`Extracted ${result.metadata.itemCount} items but validation failed`);
      if (result.metadata?.missingFields?.length > 0) {
        evidence.push(`Missing fields: ${result.metadata.missingFields.join(', ')}`);
      }
      return this.createDetectedPattern('PARTIAL_SUCCESS', 0.8, evidence);
    }

    // Check for PARSE_ERROR pattern
    if (result.error && result.error.includes('parse')) {
      evidence.push('Parse error detected in output');
      return this.createDetectedPattern('PARSE_ERROR', 0.85, evidence);
    }

    // Check for TIMEOUT pattern
    if (result.error && (result.error.includes('timeout') || result.error.includes('ETIMEDOUT'))) {
      evidence.push('Timeout error detected');
      return this.createDetectedPattern('TIMEOUT', 0.95, evidence);
    }

    // Check for NETWORK_ERROR pattern
    if (result.error && (result.error.includes('ECONNREFUSED') || result.error.includes('ENOTFOUND'))) {
      evidence.push('Network connectivity issue detected');
      return this.createDetectedPattern('NETWORK_ERROR', 0.9, evidence);
    }

    // Check for INVALID_SELECTOR pattern
    if (result.error && result.error.includes('selector')) {
      evidence.push('Selector-related error detected');
      return this.createDetectedPattern('INVALID_SELECTOR', 0.75, evidence);
    }

    // Check for repeated failures (same error multiple times)
    if (previousAttempts.length >= 2) {
      const recentErrors = previousAttempts.slice(-2).map(a => a.error).filter(Boolean);
      if (recentErrors.length === 2 && recentErrors[0] === recentErrors[1]) {
        evidence.push('Same error repeated in consecutive attempts');
        return this.createDetectedPattern('REPEATED_FAILURE', 0.7, evidence);
      }
    }

    return null;
  }

  /**
   * Create a detected pattern object
   */
  private createDetectedPattern(
    patternName: string,
    confidence: number,
    evidence: string[]
  ): DetectedPattern {
    const config = this.patterns.get(patternName);
    
    return {
      pattern: patternName,
      confidence,
      suggestedFix: config?.fix || 'manual_review',
      escalate: config?.escalate || false,
      evidence
    };
  }

  /**
   * Get all registered patterns
   */
  getPatterns(): PatternConfig[] {
    return Array.from(this.patterns.values());
  }
}
