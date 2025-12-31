/**
 * UI Controller for Iterative Learning Mode
 */

// Initialize UI on load
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('iterative-learning-toggle');
  const ollamaToggle = document.getElementById('prefer-ollama-toggle');
  
  if (!toggle) {
    console.warn('Iterative learning toggle not found');
    return;
  }

  // Load saved states
  const savedState = localStorage.getItem('useIterativeLearning') === 'true';
  const preferOllama = localStorage.getItem('preferOllama') !== 'false'; // Default true
  
  toggle.checked = savedState;
  if (ollamaToggle) {
    ollamaToggle.checked = preferOllama;
  }
  
  // Update iterative learning on change
  toggle.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    localStorage.setItem('useIterativeLearning', enabled.toString());
    
    // Update agent if it exists
    if (window.scraperAgent) {
      window.scraperAgent.setIterativeLearningMode(enabled);
    }
    
    console.log(`🔄 Iterative Learning Mode: ${enabled ? 'ENABLED' : 'DISABLED'}`);
    
    // Show feedback
    const label = toggle.closest('label');
    const originalBg = label.style.backgroundColor;
    label.style.backgroundColor = enabled ? '#d1fae5' : '#fee2e2';
    label.style.transition = 'background-color 0.3s';
    
    setTimeout(() => {
      label.style.backgroundColor = originalBg;
    }, 600);
  });
  
  // Update Ollama preference on change
  if (ollamaToggle) {
    ollamaToggle.addEventListener('change', (e) => {
      const enabled = e.target.checked;
      localStorage.setItem('preferOllama', enabled.toString());
      
      // Update agent if it exists
      if (window.scraperAgent) {
        window.scraperAgent.preferOllama = enabled;
      }
      
      console.log(`⚡ Prefer Ollama: ${enabled ? 'ENABLED (32K context, faster)' : 'DISABLED (WebGPU fallback)'}`);
      
      // Show feedback
      const label = ollamaToggle.closest('label');
      const originalBg = label.style.backgroundColor;
      label.style.backgroundColor = enabled ? '#dbeafe' : '#fee2e2';
      label.style.transition = 'background-color 0.3s';
      
      setTimeout(() => {
        label.style.backgroundColor = originalBg;
      }, 600);
    });
  }
  
  console.log(`✅ Iterative Learning UI initialized (${savedState ? 'enabled' : 'disabled'})`);
  console.log(`✅ Prefer Ollama: ${preferOllama ? 'enabled' : 'disabled'}`);
});
