/**
 * ValidatorRegistry - Custom validators per domain
 */

import { ValidationResult } from '../core/types.js';

export interface ValidatorDefinition {
  name: string;
  description?: string;
  validate: (result: any, config: any) => ValidationResult | Promise<ValidationResult>;
}

export class ValidatorRegistry {
  private static validators: Map<string, ValidatorDefinition> = new Map();

  /**
   * Register a new validator
   */
  static register(validator: ValidatorDefinition): void {
    if (this.validators.has(validator.name)) {
      throw new Error(`Validator already registered: ${validator.name}`);
    }

    this.validators.set(validator.name, validator);
    console.log(`✅ Registered validator: ${validator.name}`);
  }

  /**
   * Get a validator by name
   */
  static get(name: string): ValidatorDefinition | undefined {
    return this.validators.get(name);
  }

  /**
   * List all registered validators
   */
  static list(): ValidatorDefinition[] {
    return Array.from(this.validators.values());
  }

  /**
   * Check if a validator is registered
   */
  static has(name: string): boolean {
    return this.validators.has(name);
  }

  /**
   * Execute a validator
   */
  static async validate(name: string, result: any, config: any): Promise<ValidationResult> {
    const validator = this.validators.get(name);
    if (!validator) {
      throw new Error(`Validator not found: ${name}`);
    }

    try {
      return await validator.validate(result, config);
    } catch (error: any) {
      return {
        validated: false,
        error: `Validator error: ${error.message}`
      };
    }
  }

  /**
   * Unregister a validator
   */
  static unregister(name: string): boolean {
    return this.validators.delete(name);
  }

  /**
   * Clear all validators (useful for testing)
   */
  static clear(): void {
    this.validators.clear();
  }

  /**
   * Get validator statistics
   */
  static getStats() {
    const validators = Array.from(this.validators.values());
    return {
      totalValidators: validators.length,
      validatorNames: validators.map(v => v.name)
    };
  }
}
