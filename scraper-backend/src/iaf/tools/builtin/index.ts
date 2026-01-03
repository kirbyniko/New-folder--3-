/**
 * Built-in tools for IAF
 */

import { z } from 'zod';
import { ToolRegistry } from '../ToolRegistry.js';
import fetch from 'node-fetch';

/**
 * Register execute_code tool (runs JavaScript in VM)
 */
export function registerExecuteCodeTool(executeEndpoint: string = 'http://localhost:3002/run') {
  ToolRegistry.register({
    name: 'execute_code',
    description: 'Execute JavaScript code in a secure VM and return the result',
    schema: z.object({
      code: z.string().describe('The JavaScript code to execute'),
      timeout: z.number().optional().describe('Timeout in milliseconds (default: 30000)')
    }),
    execute: async ({ code, timeout = 30000 }) => {
      try {
        const response = await fetch(executeEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, timeout })
        });

        if (!response.ok) {
          throw new Error(`Execute server error: ${response.statusText}`);
        }

        const result = await response.json();
        return result;
      } catch (error: any) {
        return { error: error.message };
      }
    }
  });
}

/**
 * Register fetch_url tool (HTTP GET request)
 */
export function registerFetchUrlTool() {
  ToolRegistry.register({
    name: 'fetch_url',
    description: 'Fetch HTML content from a URL',
    schema: z.object({
      url: z.string().describe('The URL to fetch'),
      headers: z.record(z.string()).optional().describe('Optional HTTP headers')
    }),
    execute: async ({ url, headers = {} }) => {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            ...headers
          }
        });

        if (!response.ok) {
          return { error: `HTTP ${response.status}: ${response.statusText}` };
        }

        const html = await response.text();
        return { html, status: response.status };
      } catch (error: any) {
        return { error: error.message };
      }
    }
  });
}

/**
 * Register test_scraper tool (executes and validates scraper)
 */
export function registerTestScraperTool(executeEndpoint: string = 'http://localhost:3002/run') {
  ToolRegistry.register({
    name: 'test_scraper',
    description: 'Execute a scraper and validate the extracted data',
    schema: z.object({
      code: z.string().describe('The scraper code to test'),
      url: z.string().describe('The URL to scrape'),
      fieldsRequired: z.array(z.string()).describe('Required fields to validate')
    }),
    execute: async ({ code, url, fieldsRequired }) => {
      try {
        // Execute the scraper
        const response = await fetch(executeEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            code: `${code}\n\nscraper('${url}').then(result => result);`,
            timeout: 30000
          })
        });

        if (!response.ok) {
          return { 
            validated: false, 
            error: `Execute server error: ${response.statusText}`,
            itemCount: 0
          };
        }

        const result = await response.json();
        
        if (result.error) {
          return {
            validated: false,
            error: result.error,
            itemCount: 0
          };
        }

        // Validate the result
        const items = result.result || [];
        if (!Array.isArray(items) || items.length === 0) {
          return {
            validated: false,
            error: 'No items extracted',
            itemCount: 0
          };
        }

        // Check field coverage
        const firstItem = items[0];
        const missingFields = fieldsRequired.filter(field => !firstItem[field]);
        const fieldCoverage = ((fieldsRequired.length - missingFields.length) / fieldsRequired.length * 100).toFixed(0);

        return {
          validated: missingFields.length === 0,
          itemCount: items.length,
          fieldCoverage: `${fieldCoverage}%`,
          missingFields,
          sampleData: items.slice(0, 5)
        };
      } catch (error: any) {
        return {
          validated: false,
          error: error.message,
          itemCount: 0
        };
      }
    },
    dependencies: ['execute_code']
  });
}

/**
 * Register all built-in tools
 */
export function registerBuiltInTools(executeEndpoint?: string) {
  registerExecuteCodeTool(executeEndpoint);
  registerFetchUrlTool();
  registerTestScraperTool(executeEndpoint);
  
  console.log('✅ Registered all built-in tools');
}
