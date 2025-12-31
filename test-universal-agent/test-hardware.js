import { SystemCapabilityDetector } from 'universal-agent-sdk';

console.log('🧪 Testing Hardware Detection\n');

async function testHardware() {
  try {
    console.log('1. Creating detector...');
    const detector = new SystemCapabilityDetector();
    console.log('✅ Detector created');

    console.log('\n2. Detecting all capabilities...');
    const capabilities = await detector.detectAll();
    console.log('\n=== DETECTED CAPABILITIES ===');
    console.log('Ollama:');
    console.log('  Available:', capabilities.ollama.available);
    console.log('  Models:', capabilities.ollama.models.length);
    console.log('  Context limits:', capabilities.ollama.contextLimits);
    
    console.log('\nGPU:');
    console.log('  Detected:', capabilities.gpu.detected);
    console.log('  Vendor:', capabilities.gpu.vendor);
    console.log('  VRAM:', Math.floor(capabilities.gpu.estimatedVRAM / 1024), 'GB');
    
    console.log('\nWebGPU:');
    console.log('  Available:', capabilities.webgpu.available);
    console.log('  Max buffer:', Math.floor(capabilities.webgpu.maxBufferSize / 1024 / 1024), 'MB');
    console.log('✅ Capabilities detected');

    console.log('\n3. Getting recommended limits...');
    const limits = detector.getRecommendedLimits();
    console.log('\n=== RECOMMENDED LIMITS ===');
    console.log('GPU 4K:', limits.gpu4K, 'tokens');
    console.log('GPU Safe (0% CPU):', limits.gpuSafe, 'tokens');
    console.log('Balanced (low CPU):', limits.balanced, 'tokens');
    console.log('Ollama 32K:', limits.ollama32K, 'tokens');
    console.log('✅ Limits calculated');

    console.log('\n4. Getting summary...');
    const summary = detector.getSummary();
    console.log('\n=== SUMMARY ===');
    console.log('Inference options:', summary.inference.length);
    summary.inference.forEach(inf => {
      console.log(`  - ${inf.name}: ${inf.available ? '✅' : '❌'}`);
      if (inf.maxContext) {
        console.log(`    Max context: ${inf.maxContext} tokens`);
      }
    });
    console.log('\nRecommendations:');
    summary.recommendations.forEach(rec => console.log('  ', rec));
    console.log('✅ Summary generated');

    console.log('\n✅ ALL HARDWARE TESTS PASSED');
    return true;
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

testHardware().then(success => {
  process.exit(success ? 0 : 1);
});
