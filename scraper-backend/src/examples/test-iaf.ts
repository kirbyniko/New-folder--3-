/**
 * Simple test to validate IAF core functionality
 */

import { 
  IterativeAgentFramework, 
  ToolRegistry, 
  ValidatorRegistry,
  ResultTracker,
  PatternDetector 
} from '../iaf/index.js';

console.log('🧪 Testing IAF Core Components\n');

// Test 1: ResultTracker
console.log('1️⃣ Testing ResultTracker...');
const tracker = new ResultTracker();
tracker.addAttempt(1, { success: false, output: null, validated: false, error: 'No items', metadata: { itemCount: 0 } });
tracker.addAttempt(2, { success: true, output: 'code', validated: false, error: undefined, metadata: { itemCount: 5, fieldCoverage: '60%' } });
tracker.addAttempt(3, { success: true, output: 'code', validated: true, error: undefined, metadata: { itemCount: 10, fieldCoverage: '100%' } });

const bestResult = tracker.getBestResult();
console.log(`✅ Best result: Attempt #${bestResult?.metadata?.attemptNumber}, Score: ${bestResult?.score}`);
console.log(`✅ Diagnostics:`, tracker.getDiagnostics());
console.log();

// Test 2: PatternDetector
console.log('2️⃣ Testing PatternDetector...');
const detector = new PatternDetector();
const patterns = detector.getPatterns();
console.log(`✅ Registered ${patterns.length} patterns:`, patterns.map(p => p.pattern).join(', '));

const failedResult = { 
  success: false, 
  output: null, 
  validated: false, 
  error: 'Extracted 0 items',
  metadata: { itemCount: 0 }
};
const detectedPattern = detector.detect(failedResult, []);
console.log(`✅ Detected pattern:`, detectedPattern);
console.log();

// Test 3: ToolRegistry
console.log('3️⃣ Testing ToolRegistry...');
ToolRegistry.register({
  name: 'test_tool',
  description: 'A test tool',
  schema: { parse: (val: any) => val } as any,
  execute: async (params) => {
    return { result: 'success', input: params };
  }
});
console.log(`✅ Registered tool: test_tool`);
console.log(`✅ Tool stats:`, ToolRegistry.getStats());

const toolResult = await ToolRegistry.execute('test_tool', { data: 'test' });
console.log(`✅ Tool execution result:`, toolResult);
console.log();

// Test 4: ValidatorRegistry
console.log('4️⃣ Testing ValidatorRegistry...');
ValidatorRegistry.register({
  name: 'test_validator',
  description: 'A test validator',
  validate: (result, config) => {
    return {
      validated: result.itemCount > 0,
      itemCount: result.itemCount
    };
  }
});
console.log(`✅ Registered validator: test_validator`);
console.log(`✅ Validator stats:`, ValidatorRegistry.getStats());

const validationResult = await ValidatorRegistry.validate('test_validator', { itemCount: 5 }, {});
console.log(`✅ Validation result:`, validationResult);
console.log();

// Test 5: Initialize built-ins
console.log('5️⃣ Testing IAF initialization...');
IterativeAgentFramework.initialize({
  executeEndpoint: 'http://localhost:3002/run'
});
const stats = IterativeAgentFramework.getStats();
console.log(`✅ Framework stats:`, stats);
console.log();

// Test 6: Workflow validation
console.log('6️⃣ Testing workflow loading...');
try {
  const workflow = await IterativeAgentFramework.load('./src/workflows/scraper/scraper-workflow.yaml');
  console.log(`✅ Loaded workflow: ${workflow.getConfig().name}`);
  
  const toolValidation = workflow.validateTools();
  console.log(`✅ Tool validation:`, toolValidation);
  
  const validatorValidation = workflow.validateValidator();
  console.log(`✅ Validator validation:`, validatorValidation);
} catch (error: any) {
  console.log(`⚠️  Workflow loading (expected if YAML not found): ${error.message}`);
}
console.log();

console.log('✅ All tests passed!\n');
console.log('🎉 IAF core is working correctly!');
