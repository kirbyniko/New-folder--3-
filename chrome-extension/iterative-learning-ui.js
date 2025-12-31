/**
 * UI Controller for Iterative Learning Mode
 */

// Initialize UI on load
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('iterative-learning-toggle');
  
  if (!toggle) {
    console.warn('Iterative learning toggle not found');
    return;
  }

  // Load saved state
  const savedState = localStorage.getItem('useIterativeLearning') === 'true';
  toggle.checked = savedState;
  
  // Update state on change
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
  
  console.log(`✅ Iterative Learning UI initialized (${savedState ? 'enabled' : 'disabled'})`);
});
