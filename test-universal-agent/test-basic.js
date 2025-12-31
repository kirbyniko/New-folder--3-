import { UniversalAgent } from 'universal-agent-sdk';

console.log('🧪 Testing Universal Agent SDK - Basic Functionality\n');

async function testBasic() {
  try {
    console.log('1. Creating agent with balanced preset...');
    const agent = new UniversalAgent({
      mode: 'chat',
      preset: 'balanced'
    });
    console.log('✅ Agent created');

    console.log('\n2. Initializing agent...');
    await agent.initialize();
    console.log('✅ Agent initialized');

    console.log('\n3. Getting token estimates...');
    const estimates = await agent.getTokenEstimates();
    console.log('Token estimates:', {
      total: estimates.total,
      fitsInGPU: estimates.fitsInGPU,
      cpuRisk: estimates.cpuRisk
    });
    console.log('✅ Token estimates retrieved');

    console.log('\n4. Testing updateConfig...');
    agent.updateConfig({ preset: 'minimal' });
    const newEstimates = await agent.getTokenEstimates();
    console.log('New token total:', newEstimates.total);
    console.log('✅ Config updated (tokens reduced from', estimates.total, 'to', newEstimates.total, ')');

    console.log('\n5. Getting metrics...');
    const metrics = agent.getMetrics();
    console.log('Metrics:', metrics);
    console.log('✅ Metrics retrieved');

    console.log('\n✅ ALL BASIC TESTS PASSED');
    return true;
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

testBasic().then(success => {
  process.exit(success ? 0 : 1);
});
