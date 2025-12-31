import { SystemCapabilityDetector } from '../src/SystemCapabilityDetector';

describe('SystemCapabilityDetector', () => {
  let detector: SystemCapabilityDetector;

  beforeEach(() => {
    detector = new SystemCapabilityDetector();
  });

  test('detectAll returns capabilities object', async () => {
    const capabilities = await detector.detectAll();
    
    expect(capabilities).toHaveProperty('ollama');
    expect(capabilities).toHaveProperty('gpu');
    expect(capabilities).toHaveProperty('webgpu');
  });

  test('getRecommendedLimits returns valid limits', () => {
    const limits = detector.getRecommendedLimits();
    
    expect(limits.gpu4K).toBeGreaterThan(0);
    expect(limits.gpuSafe).toBeGreaterThan(0);
    expect(limits.balanced).toBeGreaterThan(0);
    expect(limits.ollama32K).toBeGreaterThan(0);
  });

  test('getSummary returns structured summary', async () => {
    await detector.detectAll();
    const summary = detector.getSummary();
    
    expect(summary).toHaveProperty('inference');
    expect(summary).toHaveProperty('contextLimits');
    expect(summary).toHaveProperty('recommendations');
    expect(Array.isArray(summary.inference)).toBe(true);
    expect(Array.isArray(summary.recommendations)).toBe(true);
  });
});
