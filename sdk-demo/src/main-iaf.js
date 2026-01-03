/**
 * IAF Workflow Builder Entry Point
 * Visual interface for creating IAF workflows, tools, and multi-agent systems
 */

import './components/WorkflowBuilder.css';
import './styles/scraper-agent.css';

console.log('🚀 Initializing IAF Workflow Builder');

// Import the React WorkflowBuilder component (we'll need to convert .jsx to work with current setup)
async function init() {
  const root = document.getElementById('app');
  
  // Create navigation bar
  root.innerHTML = `
    <div style="display: flex; height: 100vh; flex-direction: column;">
      <!-- Top Navigation -->
      <div style="display: flex; gap: 8px; padding: 12px; background: #1e293b; border-bottom: 2px solid #334155;">
        <button id="nav-scraper" class="nav-btn" style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
          🤖 Scraper Agent
        </button>
        <button id="nav-iaf" class="nav-btn active" style="padding: 8px 16px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
          ⚙️ IAF Workflow Builder
        </button>
        <button id="nav-agent-workflow" class="nav-btn" style="padding: 8px 16px; background: #6366f1; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
          🔄 Agent Workflow
        </button>
      </div>
      
      <!-- Main Content Area -->
      <div id="main-content" style="flex: 1; overflow: auto;">
        <div id="iaf-workflow-container"></div>
      </div>
    </div>
  `;
  
  // Handle navigation
  document.getElementById('nav-scraper').addEventListener('click', () => {
    window.location.href = '/index.html';
  });
  
  document.getElementById('nav-agent-workflow').addEventListener('click', () => {
    window.location.href = '/agent-workflow.html';
  });
  
  // Load IAF Workflow Builder
  await loadIAFWorkflowBuilder();
  
  console.log('✅ IAF Workflow Builder Ready!');
}

async function loadIAFWorkflowBuilder() {
  const container = document.getElementById('iaf-workflow-container');
  
  // Since we created a .jsx file but this is a vanilla JS project,
  // we need to create a vanilla JS version of the WorkflowBuilder
  const { IAFWorkflowBuilder } = await import('./components/IAFWorkflowBuilder.js');
  const builder = new IAFWorkflowBuilder('iaf-workflow-container');
  window.iafBuilder = builder; // Debug access
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
