import { AgentConfigManager } from '../src/AgentConfigManager';

describe('AgentConfigManager', () => {
  let manager: AgentConfigManager;

  beforeEach(() => {
    manager = new AgentConfigManager();
  });

  test('calculateTokenEstimates returns valid estimates', async () => {
    const estimates = await manager.calculateTokenEstimates();
    
    expect(estimates.total).toBeGreaterThan(0);
    expect(estimates.basePrompt).toBeGreaterThan(0);
    expect(estimates.withContexts).toBeGreaterThanOrEqual(estimates.basePrompt);
    expect(['none', 'low', 'medium', 'high']).toContain(estimates.cpuRisk);
  });

  test('applyPreset changes configuration', async () => {
    const beforeEstimates = await manager.calculateTokenEstimates();
    
    manager.applyPreset('minimal');
    const afterEstimates = await manager.calculateTokenEstimates();
    
    expect(afterEstimates.total).toBeLessThan(beforeEstimates.total);
  });

  test('getGenerationConfig returns config object', () => {
    const config = manager.getGenerationConfig();
    
    expect(config).toHaveProperty('useRAG');
    expect(config).toHaveProperty('useKnowledge');
    expect(config).toHaveProperty('useContextGuides');
  });

  test('setEnabled modifies config', () => {
    manager.setEnabled('rag.enabled', false);
    const config = manager.getGenerationConfig();
    
    expect(config.useRAG).toBe(false);
  });
});
