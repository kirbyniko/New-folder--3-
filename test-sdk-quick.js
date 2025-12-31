/**
 * Quick SDK Test - Validates basic functionality
 */

import { UniversalAgent } from './universal-agent-sdk/dist/index.esm.js';

async function quickTest() {
  console.log('🧪 Quick SDK Test\n');

  try {
    // 1. Create agent
    console.log('1. Creating agent...');
    const agent = new UniversalAgent({
      mode: 'web-scraper',
      preset: 'balanced'
    });
    console.log('✅ Agent created\n');

    // 2. Initialize
    console.log('2. Initializing agent...');
    await agent.initialize();
    console.log('✅ Agent initialized\n');

    // 3. Get token estimates
    console.log('3. Checking token estimates...');
    const estimates = await agent.getTokenEstimates();
    console.log(`   Total tokens: ${estimates.total}`);
    console.log(`   Fits in GPU: ${estimates.fitsInGPU}`);
    console.log(`   CPU Risk: ${estimates.cpuRisk}`);
    console.log('✅ Token estimates retrieved\n');

    // 4. Try different presets
    console.log('4. Testing presets...');
    const presets = ['minimal', 'balanced', 'maximum', 'gpu'];
    for (const preset of presets) {
      agent.updateConfig({ preset });
      const est = await agent.getTokenEstimates();
      console.log(`   ${preset}: ${est.total} tokens (${est.cpuRisk} risk)`);
    }
    console.log('✅ All presets work\n');

    // 5. Get metrics
    console.log('5. Getting metrics...');
    const metrics = agent.getMetrics();
    console.log(`   Session ID: ${metrics.sessionId}`);
    console.log('✅ Metrics retrieved\n');

    console.log('🎉 ALL TESTS PASSED!\n');
    console.log('SDK is ready to use in your Chrome extension.');
    
  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

quickTest();
