/**
 * ScraperAgentUI - AI-powered scraper generator
 * Uses manual agent loop to bypass LangChain ReAct limitations
 */

export class ScraperAgentUI {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.conversation = [];
    this.serverOnline = false;
    
    this.init();
  }
  
  async init() {
    this.render();
    await this.checkServerStatus();
    
    // Auto-check server every 10s
    setInterval(() => this.checkServerStatus(), 10000);
  }
  
  render() {
    this.container.innerHTML = `
      <div class="scraper-agent-ui">
        <!-- Header -->
        <div class="scraper-header">
          <h1>🚀 Template-Based Scraper Generator</h1>
          <div style="display: flex; gap: 12px; align-items: center;">
            <button class="action-btn" id="open-scrapers-btn" style="padding: 8px 16px; font-size: 13px;">
              📚 Scraper Library
            </button>
            <div class="server-status" id="server-status">
              <span class="status-dot"></span>
              <span class="status-text">Checking...</span>
            </div>
          </div>
        </div>
        <!-- Generator Info Panel -->
        <div class="quick-config">
          <div class="generator-info">
            <h3 style="margin: 0 0 12px 0; color: #4ade80;">🎯 Choose Your Approach</h3>
            <div style="background: rgba(74, 222, 128, 0.1); padding: 12px; border-radius: 8px; font-size: 13px; line-height: 1.6; border: 2px solid rgba(74, 222, 128, 0.3);">
              <p style="margin: 0 0 8px 0;"><strong>🤖 AI Agent (Recommended):</strong> Agent inspects actual HTML → Finds correct selectors → Builds & tests scraper</p>
              <p style="margin: 0; color: #4ade80;">✓ Most accurate - finds working selectors from real HTML</p>
            </div>
          </div>
          
          <div class="template-status" style="margin-top: 16px; padding: 12px; background: rgba(59, 130, 246, 0.1); border-radius: 8px; font-size: 13px;">
            <strong style="color: #60a5fa;">⚡ Template Generator (Fast):</strong>
            <ul style="margin: 8px 0 0 0; padding-left: 20px; line-height: 1.8;">
              <li>Uses config selectors → May need fixing if selectors wrong</li>
              <li>95% code generated instantly from templates</li>
              <li>DeepSeek fixes syntax errors automatically</li>
            </ul>
          </div>
        </div>
        
        <!-- Chat Interface -->
        <div class="chat-container">
          <div class="messages" id="messages">
            <div class="message system">
              <strong>🤖 Scraper Generator Ready</strong>
              <p><strong>Paste your scraper config JSON below</strong> (from Chrome extension export)</p>
              <p style="color: #94a3b8; font-size: 13px; margin-top: 8px;">Choose generation method:</p>
              <ul style="color: #94a3b8; font-size: 13px;">
                <li><strong>🤖 Use AI Agent:</strong> Inspects HTML, finds working selectors (recommended)</li>
                <li><strong>⚡ Use Template:</strong> Fast generation using config selectors</li>
              </ul>
            </div>
          </div>
          
          <div class="input-area">
            <textarea id="user-input" 
                      placeholder="Paste your scraper config JSON here..."
                      rows="2"></textarea>
            <div style="display: flex; gap: 8px;">
              <button id="agent-btn" class="send-btn" style="flex: 1; background: linear-gradient(135deg, #4ade80 0%, #16a34a 100%);">
                🤖 Use AI Agent
              </button>
              <button id="send-btn" class="send-btn" style="flex: 1;">
                ⚡ Use Template
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.attachEventListeners();
  }
  
  attachEventListeners() {
    // Send button (template mode)
    const sendBtn = document.getElementById('send-btn');
    const agentBtn = document.getElementById('agent-btn');
    const userInput = document.getElementById('user-input');
    const openScrapersBtn = document.getElementById('open-scrapers-btn');
    
    sendBtn.addEventListener('click', () => this.sendMessage(false));
    agentBtn.addEventListener('click', () => this.sendMessage(true));
    openScrapersBtn.addEventListener('click', () => this.showScrapersManager());
    
    userInput.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        this.sendMessage(e.shiftKey); // Shift+Ctrl+Enter = agent mode
      }
    });
  }

  async checkServerStatus() {
    try {
      const response = await fetch('http://localhost:3003/health');
      const data = await response.json();
      this.serverOnline = data.status === 'ok';
      this.updateServerStatus(true);
    } catch (error) {
      this.serverOnline = false;
      this.updateServerStatus(false);
    }
  }
  
  updateServerStatus(online) {
    const statusEl = document.getElementById('server-status');
    if (online) {
      statusEl.className = 'server-status online';
      statusEl.innerHTML = '<span class="status-dot"></span><span class="status-text">Template Server Online</span>';
    } else {
      statusEl.className = 'server-status offline';
      statusEl.innerHTML = '<span class="status-dot"></span><span class="status-text">Server Offline - Start with npm run langchain</span>';
    }
  }
  
  async sendMessage(useAgent = false) {
    const userInput = document.getElementById('user-input');
    let message = userInput.value.trim();
    
    if (!message) return;
    if (!this.serverOnline) {
      this.addMessage('error', '❌ Server offline. Start LangChain server first.');
      return;
    }
    
    // Check if message looks like JSON config - if so, extract and clean it
    let scraperConfig = null;
    if (message.includes('"pageStructures"') || message.includes('"fields"')) {
      try {
        scraperConfig = JSON.parse(message);
      } catch (e) {
        // If parse fails, maybe it's embedded in text - try to extract
        const jsonMatch = message.match(/\{[\s\S]*"name"[\s\S]*\}/);
        if (jsonMatch) {
          try {
            scraperConfig = JSON.parse(jsonMatch[0]);
          } catch (e2) {
            console.warn('Failed to parse JSON from message:', e2);
          }
        }
      }
    }
    
    if (!scraperConfig) {
      this.addMessage('error', '❌ Please paste a valid scraper config JSON');
      return;
    }
    
    // Clear input
    userInput.value = '';
    
    // Add user message
    const shortConfig = `Config for: ${scraperConfig.startUrl}`;
    this.addMessage('user', shortConfig);
    
    if (useAgent) {
      // Use intelligent agent - inspects HTML and finds selectors
      await this.generateWithAgent(scraperConfig);
    } else {
      // Use template generator - fast but uses config selectors
      await this.generateWithTemplate(scraperConfig);
    }
  }
  
  async generateWithAgent(scraperConfig) {
    const loadingId = this.addMessage('progress', '🤖 Starting AI Agent...');
    
    try {
      console.log('📤 Sending to agent:', scraperConfig);
      
      // Build a clear task for the agent
      const fields = scraperConfig.pageStructures[0]?.fields || [];
      const fieldList = fields.map(f => f.fieldName || f.name || 'field').join(', ');
      
      const task = `Build a complete JavaScript web scraper for ${scraperConfig.startUrl}

Extract these fields: ${fieldList}

COMPLETE workflow (do ALL steps):
1. Use execute_code to fetch HTML and examine structure
2. Find working CSS selectors for each field
3. Build complete scraper using module.exports = async function(url) {...}
4. Use execute_code to TEST the scraper - must return actual data
5. If fields are null, fix selectors and test again
6. Return final working code

CRITICAL: Use JavaScript, require(), cheerio/axios. Test until it extracts real data!`;

      const response = await fetch('http://localhost:3003/manual-agent-validated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: task,
          config: {
            model: 'llama3-groq-tool-use',
            temperature: 0.1,
            fieldsRequired: scraperConfig.pageStructures[0]?.fields?.map(f => f.fieldName || f.name || f.field || f).filter(Boolean) || []
          }
        })
      });
      
      console.log('📥 Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Parse SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalOutput = '';
      let responseData = null; // Store complete response data
      let progressMsg = document.querySelector(`[data-id="${loadingId}"] .message-content`);
      
      console.log('📖 Starting to read SSE stream...');
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('✓ SSE stream ended');
          break;
        }
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              console.log('SSE event:', data.type, data);
              
              if (data.type === 'llm_token') {
                if (progressMsg) {
                  progressMsg.textContent += data.token || '';
                }
              } else if (data.type === 'tool_start' || data.type === 'llm_start') {
                if (progressMsg) {
                  progressMsg.textContent += `\n${data.message || ''}\n`;
                }
              } else if (data.type === 'complete') {
                // Handle multiple output formats
                if (data.output) {
                  // Manual agent format: {type: 'complete', output: '...'}
                  finalOutput = data.output;
                  
                  // Store complete data for validation (even if 0 items)
                  if (data.validated !== undefined) {
                    responseData = data; // Store full response for validation UI
                  }
                  
                  // Show validation status
                  if (data.validated === true) {
                    this.addMessage('success', `✅ Scraper validated! (${data.attempts || 1} attempts, ${data.itemCount || 0} items extracted)`);
                  } else if (data.validated === false) {
                    // Show detailed failure information with diagnostics
                    const diagnostics = data.diagnostics || {};
                    const suggestions = diagnostics.suggestions || [];
                    
                    const failureDetails = `
                      <div style="padding: 16px; background: rgba(239, 68, 68, 0.1); border: 2px solid #ef4444; border-radius: 8px; margin: 12px 0;">
                        <h4 style="margin: 0 0 12px 0; color: #ef4444;">⚠️ Validation Incomplete</h4>
                        
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 12px;">
                          <div style="padding: 10px; background: rgba(0,0,0,0.3); border-radius: 6px;">
                            <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">Attempts</div>
                            <div style="font-size: 20px; font-weight: 600; color: #e0e0e0;">${data.attempts || 5}</div>
                          </div>
                          <div style="padding: 10px; background: rgba(0,0,0,0.3); border-radius: 6px;">
                            <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">Items Found</div>
                            <div style="font-size: 20px; font-weight: 600; color: ${data.itemCount > 0 ? '#fbbf24' : '#ef4444'};">${data.itemCount || 0}</div>
                          </div>
                          <div style="padding: 10px; background: rgba(0,0,0,0.3); border-radius: 6px;">
                            <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">Field Coverage</div>
                            <div style="font-size: 20px; font-weight: 600; color: ${parseFloat(data.fieldCoverage) > 50 ? '#fbbf24' : '#ef4444'};">${data.fieldCoverage || '0%'}</div>
                          </div>
                          <div style="padding: 10px; background: rgba(0,0,0,0.3); border-radius: 6px;">
                            <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">Missing Fields</div>
                            <div style="font-size: 20px; font-weight: 600; color: #ef4444;">${(data.missingFields || []).length}</div>
                          </div>
                        </div>
                        
                        ${(data.missingFields || []).length > 0 ? `
                          <div style="margin-bottom: 12px; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 6px;">
                            <div style="font-size: 12px; color: #94a3b8; margin-bottom: 6px;">Missing Fields:</div>
                            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                              ${(data.missingFields || []).map(field => 
                                `<span style="padding: 4px 10px; background: rgba(239, 68, 68, 0.3); border: 1px solid #ef4444; border-radius: 4px; font-size: 12px; color: #fca5a5;">${field}</span>`
                              ).join('')}
                            </div>
                          </div>
                        ` : ''}
                        
                        ${suggestions.length > 0 ? `
                          <div style="margin-bottom: 12px; padding: 12px; background: rgba(59, 130, 246, 0.1); border: 1px solid #3b82f6; border-radius: 6px;">
                            <div style="font-size: 13px; font-weight: 600; color: #60a5fa; margin-bottom: 8px;">💡 Suggestions:</div>
                            <ul style="margin: 0; padding-left: 20px; color: #94a3b8; font-size: 13px; line-height: 1.6;">
                              ${suggestions.map(s => `<li>${s}</li>`).join('')}
                            </ul>
                          </div>
                        ` : ''}
                        
                        ${data.error ? `
                          <details style="margin-top: 12px;">
                            <summary style="cursor: pointer; color: #94a3b8; font-size: 13px; margin-bottom: 8px;">🔍 Technical Details</summary>
                            <div style="margin-top: 8px; padding: 10px; background: rgba(0,0,0,0.4); border-radius: 4px; font-family: monospace; font-size: 11px; color: #fca5a5; overflow-x: auto;">
                              ${data.error}
                            </div>
                          </details>
                        ` : ''}
                        
                        <div style="margin-top: 12px; padding: 10px; background: rgba(34, 197, 94, 0.1); border-radius: 6px;">
                          <p style="margin: 0; color: #94a3b8; font-size: 13px;">
                            ✅ <strong>Best attempt returned.</strong> You can:
                          </p>
                          <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #94a3b8; font-size: 13px; line-height: 1.8;">
                            <li>Review the data in the table below</li>
                            <li>Click <strong>"Continue Iterating"</strong> for automatic improvement</li>
                            <li>Click <strong>"Refine"</strong> to provide manual corrections</li>
                            <li>Accept it if partial data is sufficient</li>
                          </ul>
                          
                          <div style="display: flex; gap: 12px; margin-top: 16px;">
                            <button class="failure-continue-btn-inline" style="flex: 1; padding: 12px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                              🔄 Continue Iterating
                            </button>
                            <button class="failure-manual-btn-inline" style="flex: 1; padding: 12px; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                              🔧 Provide Manual Guidance
                            </button>
                          </div>
                        </div>
                      </div>
                    `;
                    this.addMessage('validation', failureDetails);
                    
                    // Store data for button handlers (will be set up after code display)
                    this.pendingFailureData = {
                      data: data,
                      output: data.output
                    };
                  }
                  
                } else if (data.result) {
                  // Validation loop format: {type: 'complete', result: {...}}
                  finalOutput = data.result.output || '';
                  
                  // Check if agent is requesting user help
                  if (finalOutput.includes('"status":"waiting_for_user"') || 
                      finalOutput.includes('"status": "waiting_for_user"')) {
                    try {
                      const helpRequest = JSON.parse(finalOutput);
                      if (helpRequest.status === 'waiting_for_user') {
                        console.log('🤝 Agent requesting user help');
                        this.removeMessage(loadingId);
                        await this.handleUserHelpRequest(helpRequest, scraperConfig);
                        return;
                      }
                    } catch (e) {
                      // Not a help request, continue
                    }
                  }
                } else if (data.content) {
                  // Alternative format: {type: 'complete', content: '...'}
                  finalOutput = data.content;
                }
                console.log('✅ Got final output:', finalOutput?.substring(0, 100));
              } else if (data.type === 'error') {
                throw new Error(data.content || data.message || 'Unknown error');
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', line, e);
            }
          }
        }
      }
      
      console.log('Final output length:', finalOutput?.length || 0);
      
      // Remove loading message
      this.removeMessage(loadingId);
      
      // Extract code from agent output
      let code = '';
      
      // Try markdown code block first
      const codeMatch = (finalOutput || '').match(/```(?:javascript|js)?\n([\s\S]*?)```/);
      if (codeMatch) {
        code = codeMatch[1].trim();
        console.log('✅ Found code in markdown block');
      } else if (finalOutput && finalOutput.includes('module.exports')) {
        // Direct code without markdown (from manual agent)
        code = finalOutput.trim();
        console.log('✅ Found raw code (no markdown)');
      }
      
      if (code) {
        console.log('✅ Code extracted, length:', code.length);
        
        // Validate code completeness
        const hasModuleExports = code.includes('module.exports');
        const hasFieldExtraction = code.includes('.push(') || code.includes('results');
        const hasCheerio = code.includes('cheerio') || code.includes('puppeteer');
        const isJustFetch = code.split('\n').length < 10 && !hasFieldExtraction;
        
        if (isJustFetch) {
          this.addMessage('warning', '⚠️ Agent returned incomplete code (just HTML fetch). This may indicate agent stopped early without calling test_scraper.');
        } else if (hasModuleExports && hasFieldExtraction && hasCheerio) {
          this.addMessage('system', '✅ Agent built complete scraper with extraction logic!');
        } else {
          this.addMessage('system', '✅ Agent returned code (validation: ' + 
            (hasModuleExports ? '✓exports ' : '✗exports ') +
            (hasFieldExtraction ? '✓extraction ' : '✗extraction ') +
            (hasCheerio ? '✓parser' : '✗parser') + ')');
        }
        
        // Pass metadata for saving
        const fieldsRequired = scraperConfig.pageStructures[0]?.fields?.map(f => f.fieldName || f.name || f.field || f).filter(Boolean) || [];
        const metadata = {
          fieldsRequired: fieldsRequired,
          validated: responseData?.validated || false,
          itemCount: responseData?.itemCount || 0,
          scraperConfig: scraperConfig,
          responseData: responseData
        };
        this.addCodeWithActions(code, scraperConfig.startUrl, metadata);
        
        // Set up inline failure button handlers if present
        if (this.pendingFailureData) {
          setTimeout(() => {
            const continueBtn = document.querySelector('.failure-continue-btn-inline');
            const manualBtn = document.querySelector('.failure-manual-btn-inline');
            
            if (continueBtn) {
              continueBtn.addEventListener('click', () => {
                const fieldsRequired = scraperConfig.pageStructures[0]?.fields?.map(f => f.fieldName || f.name || f.field || f).filter(Boolean) || [];
                console.log('🔄 Continue iteration from inline button');
                this.continueIteration(
                  fieldsRequired,
                  fieldsRequired, // All fields as missing when 0 items
                  code,
                  this.pendingFailureData.data.html || '',
                  scraperConfig
                );
              });
            }
            
            if (manualBtn) {
              manualBtn.addEventListener('click', () => {
                const fieldsRequired = scraperConfig.pageStructures[0]?.fields?.map(f => f.fieldName || f.name || f.field || f).filter(Boolean) || [];
                console.log('🔧 Manual guidance from inline button');
                this.showFeedbackForm(
                  fieldsRequired,
                  fieldsRequired, // All fields as missing when 0 items
                  code,
                  this.pendingFailureData.data.html || '',
                  scraperConfig
                );
              });
            }
          }, 100);
          
          this.pendingFailureData = null; // Clear after setting up handlers
        }
        
        // Show validation table if we have sample data (partial success)
        if (responseData && responseData.sampleData && responseData.sampleData.length > 0) {
          console.log('📊 Showing validation table with', responseData.sampleData.length, 'sample items');
          this.showValidationTable(responseData, scraperConfig);
        } else if (responseData && responseData.validated === false) {
          // No items extracted but we have failure data - show action buttons
          console.log('⚠️ No items extracted, showing failure action panel');
          this.showFailureActionPanel(responseData, scraperConfig);
        }
      } else {
        console.log('⚠️ No code block found, showing raw output');
        this.addMessage('assistant', finalOutput || '(empty response)');
      }
      
    } catch (error) {
      console.error('❌ Agent error:', error);
      this.removeMessage(loadingId);
      this.addMessage('error', `❌ Agent failed: ${error.message}`);
    }
  }
  
  async handleUserHelpRequest(helpRequest, scraperConfig) {
    console.log('🤝 Handling user help request:', helpRequest);
    
    // Create modal with question and options
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 700px;">
        <div class="modal-header">
          <h3>🤝 Agent Needs Your Help</h3>
          <button class="close-modal">&times;</button>
        </div>
        <div class="modal-body">
          <div style="margin-bottom: 20px;">
            <strong style="font-size: 16px;">${helpRequest.question}</strong>
          </div>
          
          ${helpRequest.context ? `
            <div style="background: #f5f5f5; padding: 12px; border-radius: 6px; margin-bottom: 20px; font-family: monospace; font-size: 12px; white-space: pre-wrap; max-height: 200px; overflow-y: auto;">
${helpRequest.context}
            </div>
          ` : ''}
          
          <div style="margin-bottom: 20px;">
            <strong>Select an option:</strong>
            <div style="margin-top: 12px;">
              ${helpRequest.options.map((option, i) => `
                <label style="display: block; padding: 12px; margin-bottom: 8px; background: white; border: 2px solid #e0e0e0; border-radius: 6px; cursor: pointer; transition: all 0.2s;">
                  <input type="radio" name="help-option" value="${i}" style="margin-right: 10px;">
                  ${option}
                </label>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn">Cancel</button>
          <button class="submit-btn">Continue with Selection</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Style radio labels to highlight on hover/select
    const labels = modal.querySelectorAll('label');
    labels.forEach(label => {
      const radio = label.querySelector('input[type="radio"]');
      label.addEventListener('click', () => {
        labels.forEach(l => l.style.borderColor = '#e0e0e0');
        label.style.borderColor = '#2196F3';
      });
      radio.addEventListener('change', () => {
        labels.forEach(l => l.style.borderColor = '#e0e0e0');
        label.style.borderColor = '#2196F3';
      });
    });
    
    return new Promise((resolve) => {
      modal.querySelector('.close-modal').addEventListener('click', () => {
        modal.remove();
        this.addMessage('system', '❌ User cancelled help request');
        resolve(null);
      });
      
      modal.querySelector('.cancel-btn').addEventListener('click', () => {
        modal.remove();
        this.addMessage('system', '❌ User cancelled help request');
        resolve(null);
      });
      
      modal.querySelector('.submit-btn').addEventListener('click', async () => {
        const selected = modal.querySelector('input[name="help-option"]:checked');
        if (!selected) {
          alert('Please select an option');
          return;
        }
        
        const selectedIndex = parseInt(selected.value);
        const selectedOption = helpRequest.options[selectedIndex];
        
        modal.remove();
        
        this.addMessage('system', `✅ You selected: ${selectedOption}`);
        
        // Continue agent with user's answer
        const loadingId = this.addMessage('progress', '🔄 Continuing agent with your input...');
        
        try {
          // Build continuation task
          const fields = scraperConfig.pageStructures[0]?.fields || [];
          const fieldList = fields.map(f => f.fieldName || f.name || 'field').join(', ');
          
          const continuationTask = `User answered your question: "${helpRequest.question}"

User's answer: ${selectedOption}

Now continue building the scraper with this information. Use the selector/element the user identified.

Remember:
- Extract these fields: ${fieldList}
- Build complete scraper with module.exports = async function(url) {...}
- Use test_scraper to validate
- URL: ${scraperConfig.startUrl}`;
          
          const response = await fetch('http://localhost:3003/agent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              task: continuationTask,
              config: {
                model: 'qwen2.5-coder:7b',
                context: 'scraper-guide',
                tools: ['execute_code', 'test_scraper', 'request_user_help'],
                temperature: 0.1,
                pageStructures: scraperConfig.pageStructures
              }
            })
          });
          
          // Handle SSE response (same as generateWithAgent)
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let finalOutput = '';
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.type === 'complete' && data.result) {
                    finalOutput = data.result.output || '';
                  }
                } catch (e) {}
              }
            }
          }
          
          this.removeMessage(loadingId);
          
          // Extract code and show result
          const codeMatch = (finalOutput || '').match(/```(?:javascript|js)?\n([\s\S]*?)```/);
          if (codeMatch) {
            this.addMessage('system', '✅ Agent completed scraper with your help!');
            this.addCodeWithActions(codeMatch[1], scraperConfig.startUrl);
          } else {
            this.addMessage('assistant', finalOutput || 'No response');
          }
          
        } catch (error) {
          console.error('❌ Continuation error:', error);
          this.removeMessage(loadingId);
          this.addMessage('error', `❌ Failed to continue: ${error.message}`);
        }
        
        resolve(selectedOption);
      });
    });
  }
  
  async generateWithTemplate(scraperConfig) {
    const loadingId = this.addMessage('progress', '⏳ Generating scraper with templates...');
    
    try {
      const response = await fetch('http://localhost:3003/template-scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: scraperConfig
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      
      // Remove loading message
      this.removeMessage(loadingId);
      
      // Show results
      if (result.success) {
        this.addMessage('system', `✅ Generated with template: ${result.template} (${result.attempts} attempt${result.attempts > 1 ? 's' : ''})`);
        this.addCodeWithActions(result.code, scraperConfig.startUrl);
      } else {
        this.addMessage('error', `❌ Generation failed: ${result.error}`);
        this.addMessage('assistant', `Partial code:\n\`\`\`javascript\n${result.code}\n\`\`\``);
      }
      
    } catch (error) {
      this.removeMessage(loadingId);
      this.addMessage('error', `❌ Template generation failed: ${error.message}`);
    }
  }
  
  async sendMessage_OLD() {
    const userInput = document.getElementById('user-input');
    let message = userInput.value.trim();
    
    if (!message) return;
    if (!this.serverOnline) {
      this.addMessage('error', '❌ Server offline. Start LangChain server first.');
      return;
    }
    
    // Check if message looks like JSON config - if so, extract and clean it
    let scraperConfig = null;
    if (message.includes('"pageStructures"') || message.includes('"fields"')) {
      try {
        // Try to parse as JSON first
        scraperConfig = JSON.parse(message);
        
        // PRE-ANALYZE for the agent (make it impossible to miss)
        const configStr = JSON.stringify(scraperConfig).toLowerCase();
        const hasClick = configStr.includes('click');
        const hasPopup = configStr.includes('popup');
        const hasModal = configStr.includes('modal');
        const needsPuppeteer = hasClick || hasPopup || hasModal;
        
        message = `🚨 PRE-ANALYSIS COMPLETE:
- Keywords detected: ${hasClick ? '"click" ' : ''}${hasPopup ? '"popup" ' : ''}${hasModal ? '"modal" ' : ''}${needsPuppeteer ? '' : 'NONE'}
- Decision: ${needsPuppeteer ? '⚠️ MUST USE PUPPETEER (dynamic content)' : 'Use Cheerio (static)'}
- URL: ${scraperConfig.startUrl}
- Item selector: ${scraperConfig.pageStructures[0]?.itemSelector}

Your task: Build and TEST a ${needsPuppeteer ? 'Puppeteer' : 'Cheerio'} scraper.

WORKFLOW:
1. Use execute_code to fetch and inspect the HTML
2. Build the ${needsPuppeteer ? 'Puppeteer' : 'Cheerio'} script
3. Use execute_code to TEST the script
4. Debug and fix errors
5. Iterate until working

Configuration:
${JSON.stringify(scraperConfig, null, 2)}`;
        
        // Force scraper-guide context when scraper config is detected
        this.config.context = 'scraper-guide';
        console.log('🎯 Detected scraper config - PRE-ANALYZED:', needsPuppeteer ? 'PUPPETEER' : 'Cheerio');
      } catch (e) {
        // If parse fails, maybe it's embedded in text - try to extract
        const jsonMatch = message.match(/\{[\s\S]*"name"[\s\S]*\}/);
        if (jsonMatch) {
          try {
            scraperConfig = JSON.parse(jsonMatch[0]);
            
            // PRE-ANALYZE for the agent
            const configStr = JSON.stringify(scraperConfig).toLowerCase();
            const hasClick = configStr.includes('click');
            const hasPopup = configStr.includes('popup');
            const hasModal = configStr.includes('modal');
            const needsPuppeteer = hasClick || hasPopup || hasModal;
            
            message = `🚨 PRE-ANALYSIS COMPLETE:
- Keywords detected: ${hasClick ? '"click" ' : ''}${hasPopup ? '"popup" ' : ''}${hasModal ? '"modal" ' : ''}${needsPuppeteer ? '' : 'NONE'}
- Decision: ${needsPuppeteer ? '⚠️ MUST USE PUPPETEER (dynamic content)' : 'Use Cheerio (static)'}
- URL: ${scraperConfig.startUrl}
- Item selector: ${scraperConfig.pageStructures[0]?.itemSelector}

Your task: Build and TEST a ${needsPuppeteer ? 'Puppeteer' : 'Cheerio'} scraper.

WORKFLOW:
1. Use execute_code to fetch and inspect the HTML
2. Build the ${needsPuppeteer ? 'Puppeteer' : 'Cheerio'} script
3. Use execute_code to TEST the script
4. Debug and fix errors
5. Iterate until working

Configuration:
${JSON.stringify(scraperConfig, null, 2)}`;
            
            // Force scraper-guide context when scraper config is detected
            this.config.context = 'scraper-guide';
            console.log('🎯 Detected scraper config - PRE-ANALYZED:', needsPuppeteer ? 'PUPPETEER' : 'Cheerio');
          } catch (e2) {
            // Keep original message if extraction fails
            console.warn('Failed to parse JSON from message:', e2);
          }
        }
      }
    }
    
    // Clear input
    userInput.value = '';
    
    // Add user message
    this.addMessage('user', message.substring(0, 500) + (message.length > 500 ? '...' : ''));
    
    // Show loading
    const loadingId = this.addMessage('progress', '⏳ Generating scraper with templates...');
    
    try {
      // Use template generator (much more reliable than ReAct agent!)
      const response = await fetch('http://localhost:3003/template-scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: scraperConfig
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      
      // Remove loading message
      this.removeMessage(loadingId);
      
      // Show results
      if (result.success) {
        this.addMessage('system', `✅ Generated with template: ${result.template} (${result.attempts} attempt${result.attempts > 1 ? 's' : ''})`);
        this.addCodeWithActions(result.code, scraperConfig.startUrl);
      } else {
        this.addMessage('error', `❌ Generation failed: ${result.error}`);
        this.addMessage('assistant', `Partial code:\n\`\`\`javascript\n${result.code}\n\`\`\``);
      }
      
    } catch (error) {
      this.removeMessage(loadingId);
      this.addMessage('error', `❌ Error: ${error.message}`);
    }
  }
  
  addCodeWithActions(code, url, metadata = {}) {
    const messagesContainer = document.getElementById('messages');
    
    const codeBlock = document.createElement('div');
    codeBlock.className = 'message assistant code-with-actions';
    codeBlock.innerHTML = `
      <div class="code-actions">
        <button class="action-btn test-btn" data-code="${this.escapeHtml(code)}" data-url="${url}">
          ▶️ Test Scraper
        </button>
        <button class="action-btn copy-btn" data-code="${this.escapeHtml(code)}">
          📋 Copy Code
        </button>
        <button class="action-btn save-btn" data-code="${this.escapeHtml(code)}" data-url="${url}">
          💾 Save Scraper
        </button>
        <button class="action-btn view-scrapers-btn">
          📚 View Saved
        </button>
      </div>
      <pre><code class="language-javascript">${this.escapeHtml(code)}</code></pre>
      <div class="test-results" style="display: none;"></div>
    `;
    
    messagesContainer.appendChild(codeBlock);
    
    // Store metadata for saving
    codeBlock.dataset.metadata = JSON.stringify(metadata);
    
    // Test button
    codeBlock.querySelector('.test-btn').addEventListener('click', async (e) => {
      const code = e.target.dataset.code;
      const url = e.target.dataset.url;
      await this.testScraper(code, url, codeBlock.querySelector('.test-results'));
    });
    
    // Copy button
    codeBlock.querySelector('.copy-btn').addEventListener('click', (e) => {
      navigator.clipboard.writeText(e.target.dataset.code);
      e.target.textContent = '✅ Copied!';
      setTimeout(() => e.target.textContent = '📋 Copy Code', 2000);
    });
    
    // Save button
    codeBlock.querySelector('.save-btn').addEventListener('click', async (e) => {
      const code = e.target.dataset.code;
      const url = e.target.dataset.url;
      const metadata = JSON.parse(codeBlock.dataset.metadata || '{}');
      await this.saveScraper(code, url, metadata, e.target);
    });
    
    // View scrapers button
    codeBlock.querySelector('.view-scrapers-btn').addEventListener('click', () => {
      this.showScrapersManager();
    });
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  async testScraper(code, url, resultsContainer) {
    resultsContainer.style.display = 'block';
    resultsContainer.innerHTML = '<p>⏳ Testing scraper...</p>';
    
    try {
      const response = await fetch('http://localhost:3002/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptCode: code,
          targetUrl: url,
          timeout: 30000
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        const itemCount = Array.isArray(result.data) ? result.data.length : 0;
        resultsContainer.innerHTML = `
          <div class="test-success">
            <h4>✅ Test Successful - Extracted ${itemCount} items</h4>
            <details>
              <summary>View JSON Output</summary>
              <pre>${JSON.stringify(result.data, null, 2)}</pre>
            </details>
            <div class="feedback-section">
              <p><strong>Is this correct?</strong></p>
              <button class="feedback-btn good">👍 Looks good</button>
              <button class="feedback-btn improve">🔧 Needs improvement</button>
            </div>
          </div>
        `;
        
        resultsContainer.querySelector('.feedback-btn.improve').addEventListener('click', () => {
          this.showImprovementDialog(code, url, result.data);
        });
        
        resultsContainer.querySelector('.feedback-btn.good').addEventListener('click', () => {
          this.addMessage('system', '✅ Scraper approved! You can copy the code above.');
        });
      } else {
        resultsContainer.innerHTML = `
          <div class="test-error">
            <h4>❌ Test Failed</h4>
            <p><strong>Error:</strong> ${result.error}</p>
            <details>
              <summary>View Logs</summary>
              <pre>${result.logs.join('\n')}</pre>
            </details>
          </div>
        `;
      }
    } catch (error) {
      resultsContainer.innerHTML = `
        <div class="test-error">
          <h4>❌ Test Failed</h4>
          <p>${error.message}</p>
        </div>
      `;
    }
  }
  
  showImprovementDialog(code, url, currentData) {
    const dialog = document.createElement('div');
    dialog.className = 'improvement-dialog';
    dialog.innerHTML = `
      <div class="dialog-content">
        <h3>🔧 Improve Scraper</h3>
        <p>What's missing or incorrect?</p>
        <textarea id="improvement-feedback" rows="4" placeholder="Example: Missing 'location' field, 'agendaUrl' is always null, etc."></textarea>
        <div class="dialog-actions">
          <button class="cancel-btn">Cancel</button>
          <button class="submit-btn">🔄 Regenerate with Agent</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    dialog.querySelector('.cancel-btn').addEventListener('click', () => dialog.remove());
    dialog.querySelector('.submit-btn').addEventListener('click', async () => {
      const feedback = document.getElementById('improvement-feedback').value;
      dialog.remove();
      
      if (!feedback.trim()) {
        this.addMessage('error', 'Please provide specific feedback about what needs to be fixed.');
        return;
      }
      
      this.addMessage('user', `Feedback: ${feedback}`);
      
      // Use agent to fix the scraper based on feedback
      const loadingId = this.addMessage('progress', '🔄 Agent analyzing feedback and regenerating scraper...');
      
      try {
        const response = await fetch('http://localhost:3003/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task: `Fix this web scraper based on user feedback.

**Current Code:**
\`\`\`javascript
${code}
\`\`\`

**Target URL:** ${url}

**Current Output (all fields are null):**
${JSON.stringify(currentData, null, 2)}

**User Feedback:** ${feedback}

**Your Task:**
1. Use execute_code to fetch and inspect the actual HTML from ${url}
2. Find the correct selectors for each field
3. Rewrite the scraper with working selectors
4. Test it with execute_code to verify it extracts real data
5. Return ONLY the final working code (no explanations)`,
            config: {
              model: 'deepseek-coder:6.7b',
              temperature: 0.1,
              tools: ['execute_code'],
              context: 'scraper-guide'
            }
          })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        // Handle SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let finalOutput = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'token') {
                // Update progress with streaming output
                const progressMsg = document.getElementById(loadingId);
                if (progressMsg) {
                  finalOutput += data.content;
                  progressMsg.innerHTML = `🔄 Agent working...<br><pre style="max-height: 200px; overflow-y: auto; font-size: 11px; margin-top: 8px;">${this.escapeHtml(finalOutput.slice(-500))}</pre>`;
                }
              } else if (data.type === 'complete') {
                finalOutput = data.output;
                break;
              }
            }
          }
        }
        
        this.removeMessage(loadingId);
        
        // Extract code from agent response
        const codeMatch = finalOutput.match(/```(?:javascript)?\n([\s\S]+?)\n```/);
        const improvedCode = codeMatch ? codeMatch[1] : finalOutput;
        
        if (improvedCode.includes('module.exports') || improvedCode.includes('async function')) {
          this.addMessage('system', '✅ Agent regenerated the scraper');
          this.addCodeWithActions(improvedCode, url);
        } else {
          this.addMessage('error', '❌ Agent did not return valid scraper code');
          this.addMessage('assistant', finalOutput);
        }
        
      } catch (error) {
        this.removeMessage(loadingId);
        this.addMessage('error', `❌ Error: ${error.message}`);
      }
    });
  }
  
  addMessage(type, content) {
    const messagesContainer = document.getElementById('messages');
    const messageId = `msg-${Date.now()}`;
    
    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.id = messageId;
    
    // For validation type, insert HTML directly
    if (type === 'validation') {
      messageEl.innerHTML = content;
    } else {
      messageEl.innerHTML = typeof content === 'string' 
        ? content.replace(/\n/g, '<br>')
        : content;
    }
    
    messagesContainer.appendChild(messageEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    return messageId;
  }
  
  removeMessage(messageId) {
    const messageEl = document.getElementById(messageId);
    if (messageEl) {
      messageEl.remove();
    }
  }
  
  showContextPopup() {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'context-modal-overlay';
    modal.innerHTML = `
      <div class="context-modal">
        <div class="context-modal-header">
          <h3>🧠 Configure Agent Knowledge</h3>
          <button class="close-modal">&times;</button>
        </div>
        <div class="context-modal-body">
          <p class="context-help">Select the knowledge areas your agent needs. Token estimates shown in parentheses.</p>
          
          <div class="context-checkboxes">
            <label class="context-checkbox">
              <input type="checkbox" value="scraper-builder" ${this.config.contextKnowledge?.includes('scraper-builder') ? 'checked' : ''}>
              <div class="checkbox-label">
                <strong>🛠️ Scraper Builder (~800 tokens)</strong>
                <span>Build scrapers using Static HTML, JSON API, or Puppeteer patterns</span>
              </div>
            </label>
            
            <label class="context-checkbox">
              <input type="checkbox" value="puppeteer-expert" ${this.config.contextKnowledge?.includes('puppeteer-expert') ? 'checked' : ''}>
              <div class="checkbox-label">
                <strong>🎭 Puppeteer Expert (~600 tokens)</strong>
                <span>Advanced browser automation for JavaScript-heavy sites</span>
              </div>
            </label>
            
            <label class="context-checkbox">
              <input type="checkbox" value="scraper-guide" ${this.config.contextKnowledge?.includes('scraper-guide') ? 'checked' : 'checked'}>
              <div class="checkbox-label">
                <strong>📚 Scraper Guide RAG (~1,500 tokens + examples)</strong>
                <span>Compressed scraper guide for Mistral with on-demand platform examples</span>
              </div>
            </label>
            
            <label class="context-checkbox">
              <input type="checkbox" value="pdf-parser" ${this.config.contextKnowledge?.includes('pdf-parser') ? 'checked' : ''}>
              <div class="checkbox-label">
                <strong>📄 PDF Agenda Parser (~1,200 tokens)</strong>
                <span>Extract bills, tags, and topics from legislative PDF agendas</span>
              </div>
            </label>
            
            <label class="context-checkbox">
              <input type="checkbox" value="agenda-summarizer" ${this.config.contextKnowledge?.includes('agenda-summarizer') ? 'checked' : ''}>
              <div class="checkbox-label">
                <strong>✍️ Agenda Summarizer (~850 tokens)</strong>
                <span>Generate AI summaries of meeting agendas using Ollama</span>
              </div>
            </label>
            
            <label class="context-checkbox">
              <input type="checkbox" value="data-analyzer" ${this.config.contextKnowledge?.includes('data-analyzer') ? 'checked' : ''}>
              <div class="checkbox-label">
                <strong>📊 Data Analyzer (~400 tokens)</strong>
                <span>Validate and analyze scraped data for quality</span>
              </div>
            </label>
            
            <label class="context-checkbox">
              <input type="checkbox" value="general-assistant" ${this.config.contextKnowledge?.includes('general-assistant') ? 'checked' : ''}>
              <div class="checkbox-label">
                <strong>🌐 General Assistant (~300 tokens)</strong>
                <span>Web research and information gathering</span>
              </div>
            </label>
          </div>
          
          <div class="token-warning" style="display: none; margin: 16px 0; padding: 12px; background: rgba(255, 193, 7, 0.1); border: 1px solid #ffc107; border-radius: 8px;">
            <strong style="color: #ffc107;">⚠️ Context Warning</strong>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #ddd;"></p>
          </div>
          
          <div class="context-modal-footer">
            <button class="cancel-btn">Cancel</button>
            <button class="apply-btn">Apply</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Token estimation
    const tokenEstimates = {
      'scraper-builder': 800,
      'puppeteer-expert': 600,
      'scraper-guide': 1500,  // RAG-optimized: 1,500 tokens core + 400 on-demand
      'pdf-parser': 1200,
      'agenda-summarizer': 850,
      'data-analyzer': 400,
      'general-assistant': 300
    };
    
    const updateTokenWarning = () => {
      const selected = Array.from(modal.querySelectorAll('.context-checkboxes input:checked'))
        .map(input => input.value);
      
      const totalTokens = 500 + selected.reduce((sum, area) => sum + (tokenEstimates[area] || 500), 0);
      const modelName = this.config.model || 'mistral-nemo:12b-instruct-2407-q8_0';
      
      // Get context window size
      const contextWindows = {
        'qwen2.5-coder:1.5b': 32768,
        'qwen2.5-coder:3b': 32768,
        'qwen2.5-coder:7b': 32768,
        'qwen2.5-coder:14b': 32768,
        'mistral-nemo:12b-instruct-2407-q8_0': 4096,
        'llama3.2:3b': 8192,
        'deepseek-coder-v2:16b': 16384
      };
      
      const maxTokens = contextWindows[modelName] || 4096;
      const usableTokens = Math.floor(maxTokens * 0.7); // Reserve 30% for response
      
      const warningDiv = modal.querySelector('.token-warning');
      const warningText = warningDiv.querySelector('p');
      
      if (totalTokens > usableTokens) {
        warningDiv.style.display = 'block';
        warningText.textContent = `${totalTokens} tokens exceeds ${usableTokens} usable (${modelName} has ${maxTokens} window). Switch to qwen2.5-coder:7b or reduce knowledge areas.`;
      } else {
        warningDiv.style.display = 'none';
      }
    };
    
    // Update warning on checkbox change
    modal.querySelectorAll('.context-checkboxes input').forEach(checkbox => {
      checkbox.addEventListener('change', updateTokenWarning);
    });
    
    // Initial warning check
    updateTokenWarning();
    
    // Event listeners
    modal.querySelector('.close-modal').addEventListener('click', () => {
      modal.remove();
    });
    
    modal.querySelector('.cancel-btn').addEventListener('click', () => {
      modal.remove();
    });
    
    modal.querySelector('.apply-btn').addEventListener('click', () => {
      const selected = Array.from(modal.querySelectorAll('.context-checkboxes input:checked'))
        .map(input => input.value);
      
      this.config.contextKnowledge = selected;
      
      // Update button text
      const btn = document.getElementById('context-popup-btn');
      if (btn) {
        btn.textContent = selected.length > 0 
          ? `✓ ${selected.length} Knowledge Areas`
          : 'Configure Context';
      }
      
      // Show confirmation
      const totalTokens = 500 + selected.reduce((sum, area) => sum + (tokenEstimates[area] || 500), 0);
      this.addMessage('system', `
        <strong>Knowledge Updated</strong>
        <p>Enabled: ${selected.map(s => s.replace(/-/g, ' ')).join(', ')}</p>
        <p style="margin-top: 8px; font-size: 13px; opacity: 0.8;">Total estimated tokens: ${totalTokens}</p>
      `);
      
      modal.remove();
    });
    
    // Click overlay to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }
  
  /**
   * Show validation table for reviewing scraped data
   */
  showValidationTable(data, config) {
    const { sampleData = [], missingFields = [], fieldCoverage = '0', itemCount = 0, output = '', html = '' } = data;
    const fieldsRequired = config.fieldsRequired || config.pageStructures?.[0]?.fields?.map(f => f.fieldName || f.name || f.field || f).filter(Boolean) || [];
    
    console.log('🔍 showValidationTable called with:', {
      fieldsRequired,
      missingFields,
      sampleDataLength: sampleData.length,
      itemCount,
      configKeys: Object.keys(config)
    });
    
    if (sampleData.length === 0) {
      console.log('No sample data to validate');
      return;
    }
    
    const validationHtml = `
      <div class="validation-panel" style="margin-top: 20px; padding: 20px; border: 2px solid #fbbf24; border-radius: 8px; background: rgba(251, 191, 36, 0.05);">
        <h3 style="margin: 0 0 12px 0;">📊 Review Extracted Data (${itemCount} items found)</h3>
        <p style="margin: 0 0 16px 0; color: #94a3b8;">
          Field Coverage: <strong style="color: ${fieldCoverage == 100 ? '#22c55e' : '#f59e0b'}">${fieldCoverage}%</strong>
          (${fieldsRequired.length - missingFields.length}/${fieldsRequired.length} fields)
        </p>
        
        <div style="overflow-x: auto; margin-bottom: 16px;">
          <table class="validation-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background: #1e293b;">
                <th style="padding: 8px; text-align: left; border: 1px solid #334155;">#</th>
                ${fieldsRequired.map(field => {
                  const isEmpty = missingFields.includes(field);
                  const bgColor = isEmpty ? 'rgba(251, 191, 36, 0.2)' : 'rgba(34, 197, 94, 0.2)';
                  return `<th style="padding: 8px; text-align: left; border: 1px solid #334155; background: ${bgColor};">
                    ${field} ${isEmpty ? '⚠️' : '✅'}
                  </th>`;
                }).join('')}
              </tr>
            </thead>
            <tbody>
              ${sampleData.slice(0, 5).map((item, idx) => `
                <tr style="border-bottom: 1px solid #334155;">
                  <td style="padding: 8px; border: 1px solid #334155;">${idx + 1}</td>
                  ${fieldsRequired.map(field => {
                    const value = item[field] || '';
                    const isEmpty = !value || value.trim() === '';
                    const bgColor = isEmpty ? 'rgba(251, 191, 36, 0.1)' : 'transparent';
                    return `<td style="padding: 8px; border: 1px solid #334155; background: ${bgColor}; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      ${isEmpty ? '<em style="color: #64748b;">empty</em>' : value}
                    </td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <button class="validation-accept-btn" style="flex: 1; min-width: 200px; padding: 12px 20px; background: linear-gradient(135deg, #22c55e 0%, #16a745 100%); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
            ✅ Accept & Use This Scraper
          </button>
          <button class="validation-refine-btn" style="flex: 1; min-width: 200px; padding: 12px 20px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
            🔧 Refine Incorrect Fields
          </button>
          ${missingFields.length > 0 ? `
            <button class="validation-continue-btn" style="flex: 1; min-width: 200px; padding: 12px 20px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
              🔄 Continue Iterating (Auto-improve)
            </button>
          ` : ''}
        </div>
      </div>
    `;
    
    this.addMessage('validation', validationHtml);
    
    // Attach event listeners
    setTimeout(() => {
      const acceptBtn = document.querySelector('.validation-accept-btn');
      const refineBtn = document.querySelector('.validation-refine-btn');
      const continueBtn = document.querySelector('.validation-continue-btn');
      
      if (acceptBtn) {
        acceptBtn.addEventListener('click', () => {
          // Pass full data for save functionality
          const acceptData = {
            code: output,
            url: config.startUrl || config.pageStructures?.[0]?.startUrl,
            fields: fieldsRequired,
            validated: missingFields.length === 0,
            itemCount: itemCount
          };
          this.acceptScraper(acceptData);
        });
      }
      
      if (refineBtn) {
        console.log('🔧 Refine button clicked with fields:', fieldsRequired);
        refineBtn.addEventListener('click', () => {
          this.showFeedbackForm(fieldsRequired, missingFields, output, html, config);
        });
      }
      
      if (continueBtn) {
        console.log('🔄 Continue iteration requested');
        continueBtn.addEventListener('click', () => {
          this.continueIteration(fieldsRequired, missingFields, output, html, config);
        });
      }
    }, 100);
  }
  
  /**
   * Show failure action panel when no items extracted
   */
  showFailureActionPanel(data, config) {
    const { output = '', html = '', missingFields = [] } = data;
    const fieldsRequired = config.fieldsRequired || config.pageStructures?.[0]?.fields?.map(f => f.fieldName || f.name || f.field || f).filter(Boolean) || [];
    
    console.log('🚨 showFailureActionPanel called with:', {
      fieldsRequired,
      hasOutput: !!output,
      hasHtml: !!html,
      configKeys: Object.keys(config)
    });
    
    const actionPanelHtml = `
      <div class="failure-action-panel" style="margin-top: 20px; padding: 20px; border: 2px solid #ef4444; border-radius: 8px; background: rgba(239, 68, 68, 0.05);">
        <h3 style="margin: 0 0 12px 0; color: #ef4444;">❌ No Items Extracted</h3>
        <p style="margin: 0 0 16px 0; color: #94a3b8;">
          The scraper couldn't find any matching items. This usually means:
        </p>
        <ul style="margin: 0 0 16px 0; padding-left: 20px; color: #94a3b8; line-height: 1.8;">
          <li>Container selector doesn't match any elements on the page</li>
          <li>Page structure is different than expected</li>
          <li>Site may require JavaScript rendering (dynamic content)</li>
          <li>Selectors need to be adjusted</li>
        </ul>
        
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <button class="failure-continue-btn" style="flex: 1; min-width: 200px; padding: 12px 20px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
            🔄 Continue Iterating (Auto-improve)
          </button>
          <button class="failure-manual-btn" style="flex: 1; min-width: 200px; padding: 12px 20px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
            🔧 Provide Manual Guidance
          </button>
        </div>
        
        <p style="margin: 16px 0 0 0; padding: 12px; background: rgba(59, 130, 246, 0.1); border-radius: 6px; color: #94a3b8; font-size: 13px;">
          💡 <strong>Tip:</strong> Click "Continue Iterating" to let the AI try alternative selector strategies automatically, 
          or click "Provide Manual Guidance" to specify correct selectors from browser DevTools.
        </p>
      </div>
    `;
    
    this.addMessage('validation', actionPanelHtml);
    
    // Attach event listeners
    setTimeout(() => {
      const continueBtn = document.querySelector('.failure-continue-btn');
      const manualBtn = document.querySelector('.failure-manual-btn');
      
      if (continueBtn) {
        continueBtn.addEventListener('click', () => {
          console.log('🔄 Failure continue iteration requested');
          // For complete failure, provide generic feedback for all fields
          this.continueIteration(fieldsRequired, fieldsRequired, output, html, config);
        });
      }
      
      if (manualBtn) {
        manualBtn.addEventListener('click', () => {
          console.log('🔧 Manual guidance requested');
          this.showFeedbackForm(fieldsRequired, fieldsRequired, output, html, config);
        });
      }
    }, 100);
  }
  
  /**
   * Accept the generated scraper
   */
  acceptScraper(data) {
    const { code, url, fields, validated, itemCount } = data;
    
    this.addMessage('success', '✅ Scraper accepted! Code is ready to use.');
    
    // Show save button
    const messagesContainer = document.getElementById('messages');
    const savePromptDiv = document.createElement('div');
    savePromptDiv.className = 'message assistant';
    savePromptDiv.innerHTML = `
      <div style="padding: 16px; background: rgba(34, 197, 94, 0.1); border: 2px solid #22c55e; border-radius: 8px;">
        <p style="margin: 0 0 12px 0;">💾 <strong>Would you like to save this scraper?</strong></p>
        <button class="action-btn save-accepted-btn" style="padding: 10px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
          💾 Save to Library
        </button>
      </div>
    `;
    
    messagesContainer.appendChild(savePromptDiv);
    
    // Attach save handler
    const saveBtn = savePromptDiv.querySelector('.save-accepted-btn');
    saveBtn.addEventListener('click', async () => {
      const name = await this.showSaveModal(url);
      if (!name) return;
      
      try {
        saveBtn.textContent = '💾 Saving...';
        saveBtn.disabled = true;
        
        const scraperData = {
          name,
          url,
          code,
          fields: fields || [],
          validated: validated || false,
          itemCount: itemCount || 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        const response = await fetch('http://localhost:3003/scrapers/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(scraperData)
        });
        
        if (!response.ok) throw new Error('Failed to save scraper');
        
        const result = await response.json();
        
        saveBtn.textContent = '✅ Saved!';
        this.addMessage('success', `✅ Scraper "${name}" saved successfully!`);
        
        setTimeout(() => {
          savePromptDiv.remove();
        }, 2000);
        
      } catch (error) {
        this.addMessage('error', `Failed to save scraper: ${error.message}`);
        saveBtn.textContent = '💾 Save to Library';
        saveBtn.disabled = false;
      }
    });
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
  
  /**
   * Show feedback form for field corrections
   */
  showFeedbackForm(fields, missingFields, originalCode, html, config) {
    console.log('📝 showFeedbackForm called with:', {
      fields,
      missingFields,
      hasCode: !!originalCode,
      hasHtml: !!html,
      configKeys: config ? Object.keys(config) : []
    });
    
    if (!fields || fields.length === 0) {
      console.error('❌ No fields provided to showFeedbackForm!');
      this.addMessage('error', 'Cannot show refinement form - no fields defined');
      return;
    }
    
    const modalHtml = `
      <div class="feedback-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10000;">
        <div class="feedback-content" style="background: #1e293b; border-radius: 12px; padding: 24px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
          <h3 style="margin: 0 0 16px 0;">🔧 Provide Feedback for Incorrect Fields</h3>
          <p style="color: #94a3b8; margin: 0 0 20px 0; font-size: 14px;">
            Select fields that need improvement and provide guidance:
          </p>
          
          <div class="feedback-fields">
            ${fields.map(field => {
              const isMissing = missingFields.includes(field);
              return `
                <div class="feedback-field-item" style="margin-bottom: 20px; padding: 16px; background: rgba(51, 65, 85, 0.5); border-radius: 8px; border: 2px solid ${isMissing ? '#f59e0b' : '#334155'};">
                  <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                    <input type="checkbox" class="field-checkbox" value="${field}" ${isMissing ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
                    <span style="font-weight: 600;">${field} ${isMissing ? '⚠️' : ''}</span>
                  </label>
                  
                  <div class="feedback-details" style="display: ${isMissing ? 'block' : 'none'}; margin-left: 26px;">
                    <label style="display: block; margin-bottom: 8px;">
                      <span style="font-size: 13px; color: #94a3b8;">What's wrong?</span>
                      <select class="issue-select" style="width: 100%; padding: 8px; margin-top: 4px; background: #0f172a; border: 1px solid #334155; border-radius: 4px; color: white;">
                        <option value="missing">No data extracted</option>
                        <option value="wrong">Wrong data extracted</option>
                        <option value="partial">Some rows correct, some wrong</option>
                      </select>
                    </label>
                    
                    <label style="display: block; margin-bottom: 8px;">
                      <span style="font-size: 13px; color: #94a3b8;">Notes (describe what this field should contain):</span>
                      <textarea class="notes-input" rows="2" placeholder="E.g., 'Should extract meeting time from the date/time block'" style="width: 100%; padding: 8px; margin-top: 4px; background: #0f172a; border: 1px solid #334155; border-radius: 4px; color: white; font-family: inherit; resize: vertical;"></textarea>
                    </label>
                    
                    <label style="display: block;">
                      <span style="font-size: 13px; color: #94a3b8;">Correct CSS Selector (optional - use browser DevTools):</span>
                      <input type="text" class="selector-input" placeholder="E.g., .meeting-time" style="width: 100%; padding: 8px; margin-top: 4px; background: #0f172a; border: 1px solid #334155; border-radius: 4px; color: white; font-family: monospace;">
                      <small style="display: block; color: #64748b; font-size: 12px; margin-top: 4px;">
                        💡 Right-click element → Inspect → Copy selector
                      </small>
                    </label>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          
          <div style="display: flex; gap: 12px; margin-top: 20px;">
            <button class="submit-feedback-btn" style="flex: 1; padding: 12px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
              Submit Feedback & Refine
            </button>
            <button class="cancel-feedback-btn" style="padding: 12px 20px; background: #334155; color: white; border: none; border-radius: 8px; cursor: pointer;">
              Cancel
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = document.querySelector('.feedback-modal');
    const submitBtn = modal.querySelector('.submit-feedback-btn');
    const cancelBtn = modal.querySelector('.cancel-feedback-btn');
    
    // Toggle feedback details on checkbox change
    modal.querySelectorAll('.field-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const details = e.target.closest('.feedback-field-item').querySelector('.feedback-details');
        details.style.display = e.target.checked ? 'block' : 'none';
      });
    });
    
    // Cancel button
    cancelBtn.addEventListener('click', () => modal.remove());
    
    // Submit button
    submitBtn.addEventListener('click', async () => {
      const feedback = [];
      
      modal.querySelectorAll('.field-checkbox:checked').forEach(checkbox => {
        const fieldItem = checkbox.closest('.feedback-field-item');
        const field = checkbox.value;
        const issue = fieldItem.querySelector('.issue-select').value;
        const notes = fieldItem.querySelector('.notes-input').value.trim();
        const correctSelector = fieldItem.querySelector('.selector-input').value.trim();
        
        if (notes || correctSelector) {
          feedback.push({ field, issue, notes, correctSelector });
        }
      });
      
      if (feedback.length === 0) {
        alert('Please select at least one field and provide notes or a selector.');
        return;
      }
      
      modal.remove();
      
      // Extract URL from config (multiple possible locations)
      const url = config.startUrl || config.pageStructures?.[0]?.startUrl || config.url;
      console.log('🔄 Refining with URL:', url);
      
      await this.refineScraper(originalCode, url, feedback, fields, html);
    });
    
    // Click overlay to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }
  
  /**
   * Refine scraper with user feedback
   */
  async refineScraper(originalCode, url, feedback, fieldsRequired, html) {
    const loadingId = this.addMessage('loading', '🔧 Refining scraper with your corrections...');
    
    try {
      const response = await fetch('http://localhost:3003/manual-agent-refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalCode,
          url,
          feedback,
          fieldsRequired,
          html
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let finalOutput = '';
      let refinedData = null;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'info') {
                const progressMsg = document.getElementById(loadingId)?.querySelector('.message-content');
                if (progressMsg) {
                  progressMsg.textContent += `\n${data.message}\n`;
                }
              } else if (data.type === 'complete') {
                finalOutput = data.output;
                refinedData = data;
              } else if (data.type === 'error') {
                throw new Error(data.message);
              }
            } catch (e) {
              console.warn('Failed to parse SSE:', e);
            }
          }
        }
      }
      
      this.removeMessage(loadingId);
      
      if (refinedData) {
        if (refinedData.validated) {
          this.addMessage('success', `✅ Refinement successful! All fields now validated. (${refinedData.itemCount} items)`);
        } else {
          this.addMessage('warning', `⚠️ Refinement improved coverage to ${refinedData.fieldCoverage}%. ${refinedData.missingFields?.length || 0} fields still missing.`);
        }
        
        // Show the refined code
        this.addMessage('agent', `\`\`\`javascript\n${finalOutput}\n\`\`\``);
        
        // Show validation table for refined result if there's sample data
        if (refinedData.sampleData && refinedData.sampleData.length > 0) {
          this.showValidationTable(refinedData, { fieldsRequired, url });
        }
      }
      
    } catch (error) {
      this.removeMessage(loadingId);
      this.addMessage('error', `Refinement failed: ${error.message}`);
    }
  }

  /**
   * Continue iteration with automatic feedback for missing fields
   */
  async continueIteration(fieldsRequired, missingFields, originalCode, html, config) {
    this.addMessage('info', '🔄 Continuing iteration with automatic feedback for missing fields...');
    
    // Build automatic feedback for missing fields
    const feedback = missingFields.map(field => ({
      field: field,
      issue: 'missing',
      notes: `Please find the correct selector for the "${field}" field. Look for elements that contain this data in the HTML structure.`,
      correctSelector: '' // Let Ollama find it
    }));
    
    console.log('🤖 Auto-generated feedback:', feedback);
    
    // Call refineScraper with auto-generated feedback
    await this.refineScraper(
      originalCode,
      config.startUrl || config.pageStructures?.[0]?.startUrl || config.url,
      feedback,
      fieldsRequired,
      html
    );
  }

  async saveScraper(code, url, metadata, buttonEl) {
    // Show naming modal
    const name = await this.showSaveModal(url);
    if (!name) return; // User cancelled
    
    try {
      buttonEl.textContent = '💾 Saving...';
      buttonEl.disabled = true;
      
      const scraperData = {
        name,
        url,
        code,
        fields: metadata.fieldsRequired || [],
        validated: metadata.validated || false,
        itemCount: metadata.itemCount || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const response = await fetch('http://localhost:3003/scrapers/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scraperData)
      });
      
      if (!response.ok) throw new Error('Failed to save scraper');
      
      const result = await response.json();
      
      buttonEl.textContent = '✅ Saved!';
      this.addMessage('success', `✅ Scraper "${name}" saved successfully!`);
      
      setTimeout(() => {
        buttonEl.textContent = '💾 Save Scraper';
        buttonEl.disabled = false;
      }, 2000);
      
    } catch (error) {
      this.addMessage('error', `Failed to save scraper: ${error.message}`);
      buttonEl.textContent = '💾 Save Scraper';
      buttonEl.disabled = false;
    }
  }

  showSaveModal(defaultUrl) {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-content">
          <h3>Save Scraper</h3>
          <p>Give this scraper a memorable name:</p>
          <input type="text" id="scraper-name-input" placeholder="e.g., Juneau City Council Meetings" 
                 value="${defaultUrl ? new URL(defaultUrl).hostname : ''}" />
          <div class="modal-actions">
            <button class="btn-secondary cancel-save">Cancel</button>
            <button class="btn-primary confirm-save">Save</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      const nameInput = modal.querySelector('#scraper-name-input');
      nameInput.focus();
      nameInput.select();
      
      const confirm = () => {
        const name = nameInput.value.trim();
        if (name) {
          document.body.removeChild(modal);
          resolve(name);
        } else {
          nameInput.style.border = '2px solid #ef4444';
          setTimeout(() => nameInput.style.border = '', 500);
        }
      };
      
      modal.querySelector('.confirm-save').addEventListener('click', confirm);
      modal.querySelector('.cancel-save').addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve(null);
      });
      
      nameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') confirm();
      });
      
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
          resolve(null);
        }
      });
    });
  }

  async showScrapersManager() {
    try {
      const response = await fetch('http://localhost:3003/scrapers/list');
      if (!response.ok) throw new Error('Failed to load scrapers');
      
      let scrapers = await response.json();
      // Handle both array and {scrapers: []} format
      if (scrapers && typeof scrapers === 'object' && scrapers.scrapers) {
        scrapers = scrapers.scrapers;
      }
      if (!Array.isArray(scrapers)) {
        scrapers = [];
      }
      
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-content scrapers-manager">
          <div class="modal-header">
            <h3>📚 Saved Scrapers</h3>
            <button class="close-modal">✕</button>
          </div>
          <div class="scrapers-list">
            ${scrapers.length === 0 ? '<p class="no-scrapers">No saved scrapers yet. Generate and save a scraper to see it here!</p>' : 
              scrapers.map(s => `
                <div class="scraper-item" data-id="${s.id}">
                  <div class="scraper-info">
                    <h4>${s.name}</h4>
                    <p class="scraper-url">${s.url}</p>
                    <p class="scraper-meta">
                      ${s.validated ? '✅' : '⚠️'} ${s.itemCount} items • 
                      ${s.fields.length} fields • 
                      ${new Date(s.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div class="scraper-actions">
                    <button class="action-btn view-code" data-id="${s.id}">👁️ View</button>
                    <button class="action-btn test-saved" data-id="${s.id}">▶️ Test</button>
                    <button class="action-btn delete-scraper" data-id="${s.id}">🗑️ Delete</button>
                  </div>
                </div>
              `).join('')}
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Close button
      modal.querySelector('.close-modal').addEventListener('click', () => {
        document.body.removeChild(modal);
      });
      
      // View code
      modal.querySelectorAll('.view-code').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.dataset.id;
          await this.viewScraper(id);
          document.body.removeChild(modal);
        });
      });
      
      // Test scraper
      modal.querySelectorAll('.test-saved').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.dataset.id;
          await this.testSavedScraper(id);
          document.body.removeChild(modal);
        });
      });
      
      // Delete scraper
      modal.querySelectorAll('.delete-scraper').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.dataset.id;
          if (confirm('Are you sure you want to delete this scraper?')) {
            await this.deleteScraper(id);
            // Refresh the modal
            document.body.removeChild(modal);
            this.showScrapersManager();
          }
        });
      });
      
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
        }
      });
      
    } catch (error) {
      this.addMessage('error', `Failed to load scrapers: ${error.message}`);
    }
  }

  async viewScraper(id) {
    try {
      const response = await fetch(`http://localhost:3003/scrapers/${id}`);
      if (!response.ok) throw new Error('Failed to load scraper');
      
      let scraper = await response.json();
      // Handle both direct and {scraper: {}} format
      if (scraper && scraper.scraper) {
        scraper = scraper.scraper;
      }
      
      this.addMessage('info', `📄 Viewing scraper: **${scraper.name}**`);
      this.addMessage('info', `URL: ${scraper.url}`);
      this.addMessage('info', `Fields: ${scraper.fields.join(', ')}`);
      this.addMessage('agent', `\`\`\`javascript\n${scraper.code}\n\`\`\``);
      
      // Add action buttons
      const messagesContainer = document.getElementById('messages');
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'message assistant';
      actionsDiv.innerHTML = `
        <div class="code-actions">
          <button class="action-btn test-btn" data-code="${this.escapeHtml(scraper.code)}" data-url="${scraper.url}">
            ▶️ Test Scraper
          </button>
          <button class="action-btn copy-btn" data-code="${this.escapeHtml(scraper.code)}">
            📋 Copy Code
          </button>
        </div>
        <div class="test-results" style="display: none;"></div>
      `;
      
      messagesContainer.appendChild(actionsDiv);
      
      actionsDiv.querySelector('.test-btn').addEventListener('click', async (e) => {
        await this.testScraper(e.target.dataset.code, e.target.dataset.url, actionsDiv.querySelector('.test-results'));
      });
      
      actionsDiv.querySelector('.copy-btn').addEventListener('click', (e) => {
        navigator.clipboard.writeText(e.target.dataset.code);
        e.target.textContent = '✅ Copied!';
        setTimeout(() => e.target.textContent = '📋 Copy Code', 2000);
      });
      
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      
    } catch (error) {
      this.addMessage('error', `Failed to view scraper: ${error.message}`);
    }
  }

  async testSavedScraper(id) {
    try {
      const response = await fetch(`http://localhost:3003/scrapers/${id}`);
      if (!response.ok) throw new Error('Failed to load scraper');
      
      let scraper = await response.json();
      // Handle both direct and {scraper: {}} format
      if (scraper && scraper.scraper) {
        scraper = scraper.scraper;
      }
      
      this.addMessage('info', `🧪 Testing scraper: **${scraper.name}**`);
      
      const messagesContainer = document.getElementById('messages');
      const resultsDiv = document.createElement('div');
      resultsDiv.className = 'message assistant';
      resultsDiv.innerHTML = '<div class="test-results"></div>';
      messagesContainer.appendChild(resultsDiv);
      
      await this.testScraper(scraper.code, scraper.url, resultsDiv.querySelector('.test-results'));
      
    } catch (error) {
      this.addMessage('error', `Failed to test scraper: ${error.message}`);
    }
  }

  async deleteScraper(id) {
    try {
      const response = await fetch(`http://localhost:3003/scrapers/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete scraper');
      
      this.addMessage('success', '✅ Scraper deleted successfully');
      
    } catch (error) {
      this.addMessage('error', `Failed to delete scraper: ${error.message}`);
    }
  }
}

