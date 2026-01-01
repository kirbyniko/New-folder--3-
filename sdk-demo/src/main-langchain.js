/**
 * LangChain Agent Demo - Main Entry Point
 * Clean, minimal setup for LangChain-powered agents
 */

import { LangChainAgentUI } from './components/LangChainAgentUI.js';
import './styles/langchain-ui.css';

console.log('🚀 LangChain Agent Demo Loading...');

// Initialize the UI when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  console.log('✅ Initializing LangChain Agent UI');
  
  // Create root container
  const root = document.getElementById('app');
  if (!root) {
    console.error('❌ Root element #app not found!');
    return;
  }
  
  root.innerHTML = '<div id="langchain-agent-container"></div>';
  
  // Initialize LangChain UI
  const agent = new LangChainAgentUI('langchain-agent-container');
  
  // Make it globally accessible for debugging
  window.langchainAgent = agent;
  
  console.log('✅ LangChain Agent UI Ready!');
  console.log('📡 Make sure the LangChain server is running:');
  console.log('   cd scraper-backend && npm run agent');
}
