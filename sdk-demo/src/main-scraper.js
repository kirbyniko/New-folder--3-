import { ScraperAgentUI } from './components/ScraperAgentUI.js';
import './styles/scraper-agent.css';

console.log('🚀 Initializing Scraper Agent UI');

function init() {
  const root = document.getElementById('app');
  root.innerHTML = '<div id="scraper-agent-container"></div>';
  
  const agent = new ScraperAgentUI('scraper-agent-container');
  window.scraperAgent = agent; // Debug access
  
  console.log('✅ Scraper Agent Ready!');
  console.log('💡 Quick start: Click VRAM preset, then describe your scraper');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
