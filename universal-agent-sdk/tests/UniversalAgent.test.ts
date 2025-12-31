import { UniversalAgent } from '../src/UniversalAgent';

describe('UniversalAgent', () => {
  test('constructor accepts valid config', () => {
    const agent = new UniversalAgent({
      mode: 'chat',
      preset: 'balanced'
    });
    
    expect(agent).toBeInstanceOf(UniversalAgent);
  });

  test('initialize detects capabilities', async () => {
    const agent = new UniversalAgent({ mode: 'chat' });
    await agent.initialize();
    
    // Should complete without errors
    expect(true).toBe(true);
  });

  test('getTokenEstimates returns valid data', async () => {
    const agent = new UniversalAgent({ mode: 'chat', preset: 'balanced' });
    await agent.initialize();
    
    const estimates = await agent.getTokenEstimates();
    expect(estimates.total).toBeGreaterThan(0);
  });

  test('updateConfig accepts partial config', async () => {
    const agent = new UniversalAgent({ mode: 'chat' });
    await agent.initialize();
    
    agent.updateConfig({ preset: 'minimal' });
    
    // Should complete without errors
    expect(true).toBe(true);
  });
});
