// Validation Loop Wrapper for Agent
// Ensures agent doesn't stop until test_scraper passes

import { runAgentTask } from './langchain-agent.js';

interface ValidationLoopConfig {
  task: string;
  config: any;
  onProgress?: (data: any) => void;
  maxAttempts?: number;
}

export async function runAgentWithValidation(options: ValidationLoopConfig) {
  const { task, config, onProgress, maxAttempts = 5 } = options;
  const fieldsRequired = config.fieldsRequired || [];
  
  console.log(`\n🔁 VALIDATION LOOP: Starting with max ${maxAttempts} attempts`);
  console.log(`   Required fields: ${fieldsRequired.join(', ')}`);
  
  let attempt = 0;
  let lastCode = '';
  let lastOutput = '';
  
  while (attempt < maxAttempts) {
    attempt++;
    console.log(`\n📍 Attempt ${attempt}/${maxAttempts}`);
    
    // Build task for this attempt
    let enhancedTask = task;
    
    if (attempt > 1) {
      // Add feedback from previous attempt
      enhancedTask = `${task}

⚠️ PREVIOUS ATTEMPT FAILED
Attempt #${attempt - 1} returned incomplete code or didn't call test_scraper.

${lastCode ? `Last code generated:\n\`\`\`javascript\n${lastCode}\n\`\`\`` : ''}

You MUST:
1. Build complete scraper with module.exports
2. Call test_scraper to validate
3. Fix any validation errors
4. Do NOT return code without testing it first!`;
    }
    
    // Run agent
    const result = await runAgentTask(enhancedTask, config, onProgress);
    
    if (!result.success) {
      console.log(`❌ Attempt ${attempt} failed: ${result.error}`);
      continue;
    }
    
    lastOutput = result.output || '';
    
    // Extract code from output
    const codeMatch = lastOutput.match(/```(?:javascript|js)?\n([\s\S]*?)```/);
    if (codeMatch) {
      lastCode = codeMatch[1].trim();
    }
    
    // Check if output contains test_scraper success
    const hasTestSuccess = lastOutput.includes('"success":true') || 
                          lastOutput.includes('"success": true') ||
                          lastOutput.includes('✅ SUCCESS');
    
    if (hasTestSuccess) {
      console.log(`✅ Validation passed on attempt ${attempt}!`);
      return {
        success: true,
        output: lastOutput,
        code: lastCode,
        attempts: attempt,
        validated: true
      };
    }
    
    // Check if agent even called test_scraper
    const calledTestScraper = lastOutput.includes('test_scraper') || 
                              lastOutput.includes('Tool: test_scraper');
    
    if (!calledTestScraper) {
      console.log(`⚠️  Agent didn't call test_scraper on attempt ${attempt}`);
      console.log(`   Will retry with stronger instructions`);
    } else {
      console.log(`⚠️  test_scraper was called but validation failed`);
    }
  }
  
  // Max attempts reached
  console.log(`\n❌ Max attempts (${maxAttempts}) reached without validation`);
  return {
    success: false,
    output: lastOutput,
    code: lastCode,
    attempts: maxAttempts,
    validated: false,
    error: 'Agent did not complete validation loop'
  };
}
