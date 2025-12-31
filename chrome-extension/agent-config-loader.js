// Agent Config Loader - Loads panel and detects GPU/Ollama capabilities
(async function() {
  console.log('🔧 Loading agent configuration panel...');
  
  try {
    // Load agent-config-panel.html content
    const response = await fetch(chrome.runtime.getURL('agent-config-panel.html'));
    const html = await response.text();
    const div = document.createElement('div');
    div.innerHTML = html;
    document.body.appendChild(div);
    
    console.log('✅ Agent config panel loaded');
  } catch (error) {
    console.error('❌ Failed to load agent config panel:', error);
  }
})();
