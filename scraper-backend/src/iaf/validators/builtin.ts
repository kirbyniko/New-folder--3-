/**
 * Built-in validators for common use cases
 */

import { ValidatorRegistry } from './ValidatorRegistry.js';
import { ValidationResult } from '../core/types.js';

/**
 * Field coverage validator - checks if all required fields are present
 */
export function registerFieldCoverageValidator() {
  ValidatorRegistry.register({
    name: 'field_coverage',
    description: 'Validates that all required fields are present in extracted items',
    validate: (result, config) => {
      const { fieldsRequired } = config;
      
      // Check if result has items
      const items = result.result || result.items || [];
      if (!Array.isArray(items) || items.length === 0) {
        return {
          validated: false,
          error: 'No items extracted',
          itemCount: 0,
          fieldCoverage: '0%',
          missingFields: fieldsRequired
        };
      }

      // Check field coverage in first item
      const firstItem = items[0];
      const missingFields = fieldsRequired.filter((field: string) => !firstItem[field]);
      const fieldCoverage = ((fieldsRequired.length - missingFields.length) / fieldsRequired.length * 100).toFixed(0);

      return {
        validated: missingFields.length === 0,
        itemCount: items.length,
        fieldCoverage: `${fieldCoverage}%`,
        missingFields,
        partial: missingFields.length > 0 && missingFields.length < fieldsRequired.length,
        sampleData: items.slice(0, 5)
      };
    }
  });
}

/**
 * JSON schema validator - validates result against a JSON schema
 */
export function registerSchemaValidator() {
  ValidatorRegistry.register({
    name: 'json_schema',
    description: 'Validates result against a JSON schema',
    validate: (result, schema) => {
      // Simple schema validation (can be enhanced with ajv or similar)
      try {
        const errors: string[] = [];

        // Check required properties
        if (schema.required && Array.isArray(schema.required)) {
          for (const prop of schema.required) {
            if (!(prop in result)) {
              errors.push(`Missing required property: ${prop}`);
            }
          }
        }

        return {
          validated: errors.length === 0,
          error: errors.length > 0 ? errors.join(', ') : undefined,
          diagnostics: { errors }
        };
      } catch (error: any) {
        return {
          validated: false,
          error: `Schema validation error: ${error.message}`
        };
      }
    }
  });
}

/**
 * Item count validator - checks if minimum number of items extracted
 */
export function registerItemCountValidator() {
  ValidatorRegistry.register({
    name: 'item_count',
    description: 'Validates that at least a minimum number of items were extracted',
    validate: (result, config) => {
      const { minItems = 1 } = config;
      const items = result.result || result.items || [];
      const itemCount = Array.isArray(items) ? items.length : 0;

      return {
        validated: itemCount >= minItems,
        itemCount,
        error: itemCount < minItems ? `Expected at least ${minItems} items, got ${itemCount}` : undefined
      };
    }
  });
}

/**
 * Register all built-in validators
 */
export function registerBuiltInValidators() {
  registerFieldCoverageValidator();
  registerSchemaValidator();
  registerItemCountValidator();
  
  console.log('✅ Registered all built-in validators');
}
