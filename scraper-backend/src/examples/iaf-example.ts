/**
 * Example usage of the Iterative Agent Framework (IAF)
 * 
 * This demonstrates how to use IAF to build a scraper workflow
 */

import { IterativeAgentFramework, ToolRegistry, ValidatorRegistry } from '../iaf/index.js';
import { ChatOllama } from '@langchain/ollama';
import { createReactAgent } from '@langchain/langgraph/prebuilt';

async function main() {
  console.log('🚀 IAF Example: Web Scraper Generator\n');

  // Step 1: Initialize IAF with built-in tools and validators
  console.log('📦 Initializing IAF...');
  IterativeAgentFramework.initialize({
    executeEndpoint: 'http://localhost:3002/run'
  });
  console.log('✅ IAF initialized\n');

  // Step 2: Load workflow from YAML
  console.log('📄 Loading workflow configuration...');
  const workflow = await IterativeAgentFramework.load(
    './src/workflows/scraper/scraper-workflow.yaml'
  );
  console.log(`✅ Loaded workflow: ${workflow.getConfig().name}\n`);

  // Step 3: Validate tools and validators
  console.log('🔍 Validating configuration...');
  const toolValidation = workflow.validateTools();
  if (!toolValidation.valid) {
    console.error('❌ Missing tools:', toolValidation.missing);
    return;
  }
  console.log('✅ All required tools registered');

  const validatorValidation = workflow.validateValidator();
  if (!validatorValidation.valid) {
    console.error('❌ Validator error:', validatorValidation.error);
    return;
  }
  console.log('✅ Validator registered\n');

  // Step 4: Get the wrapper and prepare to execute
  const wrapper = workflow.getWrapper();
  const config = workflow.getConfig();

  console.log('📊 Workflow Configuration:');
  console.log(`  - Name: ${config.name}`);
  console.log(`  - Layers: ${config.iterativeWrapper.layers.length}`);
  config.iterativeWrapper.layers.forEach((layer, i) => {
    console.log(`    ${i + 1}. ${layer.name} (${layer.maxAttempts} attempts, ${layer.strategy})`);
  });
  console.log(`  - Agent: ${config.agent.name} (${config.agent.model})`);
  console.log(`  - Tools: ${config.agent.tools.join(', ')}`);
  console.log(`  - Validator: ${config.validation.name}\n`);

  // Step 5: Create the agent
  console.log('🤖 Creating LangChain agent...');
  const tools = ToolRegistry.getLangChainTools(config.agent.tools);
  const llm = new ChatOllama({
    model: config.agent.model,
    temperature: config.agent.temperature
  });
  
  const agent = createReactAgent({
    llm,
    tools,
    messageModifier: config.agent.systemPrompt
  });
  console.log('✅ Agent created\n');

  // Step 6: Execute the workflow
  console.log('🔄 Executing workflow...\n');
  
  const result = await wrapper.execute(
    {
      task: 'Build a scraper for https://example.com to extract title and description',
      config: {
        startUrl: 'https://example.com',
        fieldsRequired: ['title', 'description']
      },
      onProgress: (progress) => {
        // Log progress updates
        const icon = progress.status === 'completed' ? '✅' : 
                    progress.status === 'failed' ? '❌' : '⏳';
        console.log(`${icon} [${progress.layer || 'workflow'}${progress.attempt ? ` #${progress.attempt}` : ''}] ${progress.message}`);
      }
    },
    async (layerName, attemptNumber, context, previousResults) => {
      // This is where we'd call the actual agent
      // For now, return a mock result for demonstration
      
      console.log(`  🔧 Executing ${layerName} attempt ${attemptNumber}...`);
      
      // Simulate agent execution
      const mockResult = {
        success: attemptNumber === 3, // Succeed on 3rd attempt
        output: `// Mock scraper code for attempt ${attemptNumber}`,
        validated: attemptNumber === 3,
        metadata: {
          itemCount: attemptNumber === 3 ? 5 : 0,
          fieldCoverage: attemptNumber === 3 ? '100%' : '0%',
          missingFields: attemptNumber === 3 ? [] : ['title', 'description']
        }
      };
      
      // Validate using the configured validator
      const validationResult = await ValidatorRegistry.validate(
        config.validation.name,
        { result: mockResult.metadata.itemCount > 0 ? [{ title: 'Test', description: 'Test' }] : [] },
        { fieldsRequired: context.config.fieldsRequired }
      );
      
      return {
        ...mockResult,
        validated: validationResult.validated
      };
    }
  );

  // Step 7: Display results
  console.log('\n' + '='.repeat(60));
  console.log('📊 WORKFLOW RESULTS');
  console.log('='.repeat(60));
  console.log(`Status: ${result.success ? '✅ SUCCESS' : '⚠️  PARTIAL SUCCESS / FAILURE'}`);
  console.log(`Validated: ${result.validated ? '✅ Yes' : '❌ No'}`);
  console.log(`Total Attempts: ${result.totalAttempts}`);
  console.log(`Layers Executed: ${result.layerResults.length}`);
  console.log('\nLayer Results:');
  result.layerResults.forEach((layer, i) => {
    console.log(`  ${i + 1}. ${layer.diagnostics.layerName}:`);
    console.log(`     - Attempts: ${layer.attempts}`);
    console.log(`     - Best Attempt: #${layer.bestAttempt}`);
    console.log(`     - Success: ${layer.success ? '✅' : '❌'}`);
    if (layer.pattern) {
      console.log(`     - Pattern Detected: ${layer.pattern}`);
      console.log(`     - Fix Applied: ${layer.fixApplied}`);
    }
  });
  
  console.log('\n📈 Framework Statistics:');
  const stats = IterativeAgentFramework.getStats();
  console.log(`  - Tools Registered: ${stats.tools.totalTools}`);
  console.log(`  - Validators Registered: ${stats.validators.totalValidators}`);
  
  console.log('\n✅ Example completed successfully!');
}

// Run the example
main().catch(console.error);
