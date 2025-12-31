import { UniversalAgent } from 'universal-agent-sdk';
import { SystemCapabilityDetector } from 'universal-agent-sdk';

// Global agent instance
let agent = null;

// Tab Navigation
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Update content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(tab).classList.add('active');
  });
});

// Hardware Detection Tab
document.getElementById('detect-hardware-btn')?.addEventListener('click', async () => {
  const btn = document.getElementById('detect-hardware-btn');
  const loading = document.getElementById('hardware-loading');
  const results = document.getElementById('hardware-results');
  
  btn.disabled = true;
  loading.classList.remove('hidden');
  results.classList.add('hidden');
  
  try {
    const detector = new SystemCapabilityDetector();
    const capabilities = await detector.detectAll();
    const limits = detector.getRecommendedLimits();
    const summary = detector.getSummary();
    
    // Build results HTML
    let html = '<div class="result-section">';
    
    // Ollama
    html += '<h3>🦙 Ollama</h3>';
    html += '<div class="result-grid">';
    html += `<div class="result-card">
      <h4>Status</h4>
      <div class="result-value ${capabilities.ollama.available ? 'success' : 'danger'}">
        ${capabilities.ollama.available ? '✅ Available' : '❌ Not Available'}
      </div>
    </div>`;
    
    if (capabilities.ollama.available) {
      html += `<div class="result-card">
        <h4>Models</h4>
        <div class="result-value">${capabilities.ollama.models.length}</div>
        <div class="result-label">Installed models</div>
      </div>`;
      
      html += `<div class="result-card">
        <h4>Max Context</h4>
        <div class="result-value">${Math.max(...Object.values(capabilities.ollama.contextLimits)).toLocaleString()}</div>
        <div class="result-label">tokens</div>
      </div>`;
    }
    html += '</div>';
    
    // Models list
    if (capabilities.ollama.available && capabilities.ollama.models.length > 0) {
      html += '<div style="margin-top: 20px;"><h4>Installed Models:</h4><ul style="list-style: none; padding: 0;">';
      capabilities.ollama.models.forEach(model => {
        const ctx = capabilities.ollama.contextLimits[model.name] || 'Unknown';
        html += `<li style="padding: 8px; background: var(--bg); margin: 5px 0; border-radius: 5px;">
          <strong>${model.name}</strong> - ${ctx.toLocaleString()} tokens
        </li>`;
      });
      html += '</ul></div>';
    }
    html += '</div>';
    
    // GPU
    html += '<div class="result-section">';
    html += '<h3>🎮 GPU</h3>';
    html += '<div class="result-grid">';
    html += `<div class="result-card">
      <h4>Detected</h4>
      <div class="result-value ${capabilities.gpu.detected ? 'success' : 'danger'}">
        ${capabilities.gpu.detected ? '✅ Yes' : '❌ No'}
      </div>
    </div>`;
    
    if (capabilities.gpu.detected) {
      html += `<div class="result-card">
        <h4>Vendor</h4>
        <div class="result-value">${capabilities.gpu.vendor}</div>
      </div>`;
      
      html += `<div class="result-card">
        <h4>VRAM</h4>
        <div class="result-value">${(capabilities.gpu.vramMB / 1024).toFixed(1)}</div>
        <div class="result-label">GB</div>
      </div>`;
    }
    html += '</div></div>';
    
    // WebGPU
    html += '<div class="result-section">';
    html += '<h3>🌐 WebGPU</h3>';
    html += '<div class="result-grid">';
    html += `<div class="result-card">
      <h4>Available</h4>
      <div class="result-value ${capabilities.webgpu.available ? 'success' : 'danger'}">
        ${capabilities.webgpu.available ? '✅ Yes' : '❌ No'}
      </div>
    </div>`;
    
    if (capabilities.webgpu.available) {
      html += `<div class="result-card">
        <h4>Max Buffer</h4>
        <div class="result-value">${(capabilities.webgpu.maxBufferSize / (1024 * 1024)).toFixed(0)}</div>
        <div class="result-label">MB</div>
      </div>`;
    }
    html += '</div></div>';
    
    // Recommended Limits
    html += '<div class="result-section">';
    html += '<h3>📊 Recommended Token Limits</h3>';
    html += '<div class="result-grid">';
    html += `<div class="result-card">
      <h4>GPU 4K</h4>
      <div class="result-value">${limits.gpu4K.toLocaleString()}</div>
      <div class="result-label">tokens</div>
    </div>`;
    html += `<div class="result-card">
      <h4>GPU Safe</h4>
      <div class="result-value">${limits.gpuSafe.toLocaleString()}</div>
      <div class="result-label">0% CPU</div>
    </div>`;
    html += `<div class="result-card">
      <h4>Balanced</h4>
      <div class="result-value">${limits.balanced.toLocaleString()}</div>
      <div class="result-label">low CPU</div>
    </div>`;
    html += `<div class="result-card">
      <h4>Ollama 32K</h4>
      <div class="result-value">${limits.ollama32K.toLocaleString()}</div>
      <div class="result-label">unlimited</div>
    </div>`;
    html += '</div></div>';
    
    // Recommendations
    if (summary.recommendations && summary.recommendations.length > 0) {
      html += '<div class="result-section">';
      html += '<h3>💡 Recommendations</h3>';
      html += '<ul style="list-style: none; padding: 0;">';
      summary.recommendations.forEach(rec => {
        html += `<li style="padding: 10px; background: var(--bg); margin: 5px 0; border-radius: 5px; border-left: 3px solid var(--primary);">
          ${rec}
        </li>`;
      });
      html += '</ul></div>';
    }
    
    results.innerHTML = html;
    results.classList.remove('hidden');
    
  } catch (error) {
    results.innerHTML = `<div class="result-section"><h3 class="danger">❌ Error</h3><p>${error.message}</p></div>`;
    results.classList.remove('hidden');
  } finally {
    loading.classList.add('hidden');
    btn.disabled = false;
  }
});

// Configuration Tab
let currentPreset = 'balanced';

document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const preset = btn.dataset.preset;
    currentPreset = preset;
    
    // Update UI
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Test preset
    await testPreset(preset);
  });
});

async function testPreset(preset) {
  const loading = document.getElementById('config-loading');
  const results = document.getElementById('config-results');
  
  loading.classList.remove('hidden');
  results.classList.add('hidden');
  
  try {
    const testAgent = new UniversalAgent({
      mode: 'web-scraper',
      preset: preset
    });
    
    await testAgent.initialize();
    const estimates = await testAgent.getTokenEstimates();
    
    let html = '<div class="result-section">';
    html += `<h3>✅ ${preset.charAt(0).toUpperCase() + preset.slice(1)} Preset</h3>`;
    html += '<div class="result-grid">';
    
    html += `<div class="result-card">
      <h4>Total Tokens</h4>
      <div class="result-value">${estimates.total.toLocaleString()}</div>
    </div>`;
    
    html += `<div class="result-card">
      <h4>Fits in GPU</h4>
      <div class="result-value ${estimates.fitsInGPU ? 'success' : 'warning'}">
        ${estimates.fitsInGPU ? '✅ Yes' : '⚠️ No'}
      </div>
    </div>`;
    
    html += `<div class="result-card">
      <h4>CPU Risk</h4>
      <div class="result-value ${
        estimates.cpuRisk === 'none' ? 'success' : 
        estimates.cpuRisk === 'low' ? 'success' :
        estimates.cpuRisk === 'medium' ? 'warning' : 'danger'
      }">${estimates.cpuRisk.toUpperCase()}</div>
    </div>`;
    
    const metrics = testAgent.getMetrics();
    html += `<div class="result-card">
      <h4>Session ID</h4>
      <div class="result-value" style="font-size: 0.8em;">${metrics.sessionId.substring(0, 20)}...</div>
    </div>`;
    
    html += '</div></div>';
    
    results.innerHTML = html;
    results.classList.remove('hidden');
    
  } catch (error) {
    results.innerHTML = `<div class="result-section"><h3 class="danger">❌ Error</h3><p>${error.message}</p></div>`;
    results.classList.remove('hidden');
  } finally {
    loading.classList.add('hidden');
  }
}

// Initialize with balanced preset
testPreset('balanced');

// Execute Tab
document.getElementById('execute-btn')?.addEventListener('click', async () => {
  const btn = document.getElementById('execute-btn');
  const loading = document.getElementById('execute-loading');
  const results = document.getElementById('execute-results');
  const progress = document.getElementById('execute-progress');
  
  const taskType = document.getElementById('task-type').value;
  const taskInput = document.getElementById('task-input').value;
  const contextInput = document.getElementById('context-input').value;
  
  if (!taskInput.trim()) {
    alert('Please enter a task description');
    return;
  }
  
  btn.disabled = true;
  loading.classList.remove('hidden');
  results.classList.add('hidden');
  
  try {
    // Create agent if not exists
    if (!agent) {
      progress.textContent = 'Initializing agent...';
      agent = new UniversalAgent({
        mode: taskType,
        preset: currentPreset
      });
      await agent.initialize();
    }
    
    // Parse context
    let context = {};
    if (contextInput.trim()) {
      try {
        context = JSON.parse(contextInput);
      } catch (e) {
        context = { raw: contextInput };
      }
    }
    
    // Execute task
    progress.textContent = 'Executing task...';
    const response = await agent.execute({
      task: taskInput,
      context: context,
      onProgress: (event) => {
        progress.textContent = event.message || 'Processing...';
      }
    });
    
    // Display results
    let html = '<div class="result-section">';
    html += '<h3>✅ Task Completed</h3>';
    
    html += '<div class="result-card">';
    html += '<h4>Response</h4>';
    html += `<pre style="white-space: pre-wrap; word-wrap: break-word;">${response}</pre>`;
    html += '</div>';
    
    const metrics = agent.getMetrics();
    html += '<div class="result-grid" style="margin-top: 20px;">';
    html += `<div class="result-card">
      <h4>Avg Latency</h4>
      <div class="result-value">${metrics.avgLatency.toFixed(0)}</div>
      <div class="result-label">ms</div>
    </div>`;
    html += `<div class="result-card">
      <h4>Avg Tokens</h4>
      <div class="result-value">${metrics.avgTokens.toFixed(0)}</div>
    </div>`;
    html += `<div class="result-card">
      <h4>Total Requests</h4>
      <div class="result-value">${metrics.totalRequests}</div>
    </div>`;
    html += '</div></div>';
    
    results.innerHTML = html;
    results.classList.remove('hidden');
    
  } catch (error) {
    results.innerHTML = `<div class="result-section"><h3 class="danger">❌ Error</h3><p>${error.message}</p><pre>${error.stack}</pre></div>`;
    results.classList.remove('hidden');
  } finally {
    loading.classList.add('hidden');
    btn.disabled = false;
    progress.textContent = '';
  }
});

// Playground Tab
document.getElementById('pg-init-btn')?.addEventListener('click', async () => {
  const btn = document.getElementById('pg-init-btn');
  const console = document.getElementById('pg-console');
  const status = document.getElementById('pg-status');
  
  const mode = document.getElementById('pg-mode').value;
  const preset = document.getElementById('pg-preset').value;
  
  btn.disabled = true;
  
  function log(message, type = 'info') {
    const line = document.createElement('div');
    line.className = `console-line ${type}`;
    line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    console.appendChild(line);
    console.scrollTop = console.scrollHeight;
  }
  
  try {
    log('🚀 Creating UniversalAgent...', 'info');
    agent = new UniversalAgent({ mode, preset });
    log('✅ Agent created', 'success');
    
    log('🔍 Detecting hardware capabilities...', 'info');
    await agent.initialize();
    log('✅ Agent initialized', 'success');
    
    log('📊 Getting token estimates...', 'info');
    const estimates = await agent.getTokenEstimates();
    log(`   Total tokens: ${estimates.total}`, 'info');
    log(`   Fits in GPU: ${estimates.fitsInGPU}`, 'info');
    log(`   CPU Risk: ${estimates.cpuRisk}`, 'info');
    log('✅ Token estimates calculated', 'success');
    
    const metrics = agent.getMetrics();
    log(`📈 Session ID: ${metrics.sessionId}`, 'info');
    log('✅ Agent ready for tasks', 'success');
    
    status.innerHTML = `<div style="color: var(--success);"><strong>✅ Agent Ready</strong></div>
      <div style="margin-top: 10px;">Mode: ${mode} | Preset: ${preset}</div>
      <div>Tokens: ${estimates.total} | CPU Risk: ${estimates.cpuRisk}</div>`;
    status.classList.remove('hidden');
    
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'error');
    status.innerHTML = `<div style="color: var(--danger);"><strong>❌ Initialization Failed</strong></div>
      <div style="margin-top: 10px;">${error.message}</div>`;
    status.classList.remove('hidden');
  } finally {
    btn.disabled = false;
  }
});

// Memory Tab - Placeholder buttons
document.getElementById('test-rag-btn')?.addEventListener('click', () => {
  const results = document.getElementById('rag-results');
  results.innerHTML = `<div class="result-section">
    <h4>RAG Memory Demo</h4>
    <p>RAG memory stores episodes of agent execution and retrieves similar ones for context.</p>
    <p><em>Note: Full implementation requires real agent executions with success/failure data.</em></p>
  </div>`;
  results.classList.remove('hidden');
});

document.getElementById('test-kb-btn')?.addEventListener('click', () => {
  const results = document.getElementById('kb-results');
  results.innerHTML = `<div class="result-section">
    <h4>Knowledge Base Demo</h4>
    <p>Knowledge base learns from successful and failed attempts, storing domain-specific patterns.</p>
    <p><em>Note: Full implementation requires real agent executions with learning data.</em></p>
  </div>`;
  results.classList.remove('hidden');
});

document.getElementById('test-conv-btn')?.addEventListener('click', () => {
  const results = document.getElementById('conv-results');
  results.innerHTML = `<div class="result-section">
    <h4>Conversation Memory Demo</h4>
    <p>Conversation memory tracks chat history across sessions with user-specific context.</p>
    <p><em>Note: Full implementation requires multi-turn conversations.</em></p>
  </div>`;
  results.classList.remove('hidden');
});
