import React, { useState, useEffect } from 'react';
import './WorkflowBuilder.css';

const WorkflowBuilder = () => {
  const [workflows, setWorkflows] = useState([]);
  const [currentWorkflow, setCurrentWorkflow] = useState(null);
  const [tools, setTools] = useState([]);
  const [validators, setValidators] = useState([]);
  const [view, setView] = useState('list'); // list, edit, tools, test

  useEffect(() => {
    loadWorkflows();
    loadTools();
    loadValidators();
  }, []);

  const loadWorkflows = async () => {
    try {
      const response = await fetch('http://localhost:3003/iaf/workflows');
      const data = await response.json();
      setWorkflows(data.workflows || []);
    } catch (error) {
      console.error('Failed to load workflows:', error);
    }
  };

  const loadTools = async () => {
    try {
      const response = await fetch('http://localhost:3003/iaf/tools');
      const data = await response.json();
      setTools(data.tools || []);
    } catch (error) {
      console.error('Failed to load tools:', error);
    }
  };

  const loadValidators = async () => {
    try {
      const response = await fetch('http://localhost:3003/iaf/validators');
      const data = await response.json();
      setValidators(data.validators || []);
    } catch (error) {
      console.error('Failed to load validators:', error);
    }
  };

  const createNewWorkflow = () => {
    const newWorkflow = {
      name: 'New Workflow',
      version: '1.0.0',
      description: '',
      iterativeWrapper: {
        layers: [
          {
            name: 'worker',
            maxAttempts: 5,
            strategy: 'progressive_refinement',
            patterns: [],
            onSuccess: 'return_best',
            onFailure: 'return_best'
          }
        ]
      },
      agent: {
        name: 'Agent',
        model: 'llama3-groq-tool-use',
        temperature: 0.3,
        systemPrompt: '',
        tools: []
      },
      validation: {
        name: 'field_coverage',
        type: 'custom'
      }
    };
    setCurrentWorkflow(newWorkflow);
    setView('edit');
  };

  const saveWorkflow = async () => {
    try {
      const response = await fetch('http://localhost:3003/iaf/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentWorkflow)
      });
      const data = await response.json();
      alert('Workflow saved successfully!');
      loadWorkflows();
      setView('list');
    } catch (error) {
      alert('Failed to save workflow: ' + error.message);
    }
  };

  const testWorkflow = async () => {
    setView('test');
  };

  return (
    <div className="workflow-builder">
      <div className="builder-header">
        <h1>🔧 IAF Workflow Builder</h1>
        <div className="builder-tabs">
          <button 
            className={view === 'list' ? 'active' : ''} 
            onClick={() => setView('list')}
          >
            📋 Workflows
          </button>
          <button 
            className={view === 'tools' ? 'active' : ''} 
            onClick={() => setView('tools')}
          >
            🛠️ Tools
          </button>
          {currentWorkflow && (
            <>
              <button 
                className={view === 'edit' ? 'active' : ''} 
                onClick={() => setView('edit')}
              >
                ✏️ Edit: {currentWorkflow.name}
              </button>
              <button 
                className={view === 'test' ? 'active' : ''} 
                onClick={() => setView('test')}
              >
                🧪 Test
              </button>
            </>
          )}
        </div>
      </div>

      <div className="builder-content">
        {view === 'list' && (
          <WorkflowList 
            workflows={workflows} 
            onNew={createNewWorkflow}
            onEdit={(wf) => { setCurrentWorkflow(wf); setView('edit'); }}
            onDelete={loadWorkflows}
          />
        )}

        {view === 'edit' && currentWorkflow && (
          <WorkflowEditor 
            workflow={currentWorkflow}
            setWorkflow={setCurrentWorkflow}
            tools={tools}
            validators={validators}
            onSave={saveWorkflow}
            onTest={testWorkflow}
          />
        )}

        {view === 'tools' && (
          <ToolManager 
            tools={tools}
            onUpdate={loadTools}
          />
        )}

        {view === 'test' && currentWorkflow && (
          <WorkflowTester 
            workflow={currentWorkflow}
          />
        )}
      </div>
    </div>
  );
};

const WorkflowList = ({ workflows, onNew, onEdit, onDelete }) => {
  return (
    <div className="workflow-list">
      <div className="list-header">
        <h2>Available Workflows</h2>
        <button className="btn-primary" onClick={onNew}>
          ➕ Create New Workflow
        </button>
      </div>

      <div className="workflow-grid">
        {workflows.map((wf, i) => (
          <div key={i} className="workflow-card">
            <h3>{wf.name}</h3>
            <p className="description">{wf.description || 'No description'}</p>
            <div className="workflow-meta">
              <span>🔄 {wf.iterativeWrapper?.layers?.length || 0} layers</span>
              <span>🛠️ {wf.agent?.tools?.length || 0} tools</span>
              <span>✓ {wf.validation?.name}</span>
            </div>
            <div className="card-actions">
              <button onClick={() => onEdit(wf)}>✏️ Edit</button>
              <button onClick={() => { /* implement delete */ }}>🗑️ Delete</button>
            </div>
          </div>
        ))}

        {workflows.length === 0 && (
          <div className="empty-state">
            <p>No workflows yet. Create one to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
};

const WorkflowEditor = ({ workflow, setWorkflow, tools, validators, onSave, onTest }) => {
  const [activeTab, setActiveTab] = useState('general');

  const updateWorkflow = (path, value) => {
    const newWorkflow = { ...workflow };
    const keys = path.split('.');
    let current = newWorkflow;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    setWorkflow(newWorkflow);
  };

  const addLayer = () => {
    const newLayer = {
      name: `layer_${workflow.iterativeWrapper.layers.length + 1}`,
      maxAttempts: 3,
      strategy: 'pattern_detection',
      patterns: [],
      onSuccess: 'return_best',
      onFailure: 'return_best'
    };
    updateWorkflow('iterativeWrapper.layers', [...workflow.iterativeWrapper.layers, newLayer]);
  };

  const removeLayer = (index) => {
    const layers = [...workflow.iterativeWrapper.layers];
    layers.splice(index, 1);
    updateWorkflow('iterativeWrapper.layers', layers);
  };

  const updateLayer = (index, field, value) => {
    const layers = [...workflow.iterativeWrapper.layers];
    layers[index][field] = value;
    updateWorkflow('iterativeWrapper.layers', layers);
  };

  const addPattern = (layerIndex) => {
    const layers = [...workflow.iterativeWrapper.layers];
    if (!layers[layerIndex].patterns) layers[layerIndex].patterns = [];
    layers[layerIndex].patterns.push({
      pattern: 'NO_ITEMS',
      fix: 'use_alternative_selectors',
      escalate: true
    });
    updateWorkflow('iterativeWrapper.layers', layers);
  };

  const toggleTool = (toolName) => {
    const tools = [...workflow.agent.tools];
    const index = tools.indexOf(toolName);
    if (index > -1) {
      tools.splice(index, 1);
    } else {
      tools.push(toolName);
    }
    updateWorkflow('agent.tools', tools);
  };

  return (
    <div className="workflow-editor">
      <div className="editor-header">
        <input 
          type="text" 
          className="workflow-name-input"
          value={workflow.name}
          onChange={(e) => updateWorkflow('name', e.target.value)}
          placeholder="Workflow Name"
        />
        <div className="editor-actions">
          <button className="btn-secondary" onClick={onTest}>🧪 Test</button>
          <button className="btn-primary" onClick={onSave}>💾 Save</button>
        </div>
      </div>

      <div className="editor-tabs">
        <button className={activeTab === 'general' ? 'active' : ''} onClick={() => setActiveTab('general')}>
          📋 General
        </button>
        <button className={activeTab === 'layers' ? 'active' : ''} onClick={() => setActiveTab('layers')}>
          🔄 Layers ({workflow.iterativeWrapper.layers.length})
        </button>
        <button className={activeTab === 'agent' ? 'active' : ''} onClick={() => setActiveTab('agent')}>
          🤖 Agent
        </button>
        <button className={activeTab === 'tools' ? 'active' : ''} onClick={() => setActiveTab('tools')}>
          🛠️ Tools ({workflow.agent.tools.length})
        </button>
        <button className={activeTab === 'validation' ? 'active' : ''} onClick={() => setActiveTab('validation')}>
          ✓ Validation
        </button>
      </div>

      <div className="editor-content">
        {activeTab === 'general' && (
          <div className="tab-content">
            <div className="form-group">
              <label>Version</label>
              <input 
                type="text" 
                value={workflow.version}
                onChange={(e) => updateWorkflow('version', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea 
                value={workflow.description}
                onChange={(e) => updateWorkflow('description', e.target.value)}
                rows="3"
              />
            </div>
          </div>
        )}

        {activeTab === 'layers' && (
          <div className="tab-content">
            <div className="layers-header">
              <h3>Iterative Layers</h3>
              <button className="btn-small" onClick={addLayer}>➕ Add Layer</button>
            </div>

            {workflow.iterativeWrapper.layers.map((layer, index) => (
              <div key={index} className="layer-card">
                <div className="layer-header">
                  <input 
                    type="text" 
                    value={layer.name}
                    onChange={(e) => updateLayer(index, 'name', e.target.value)}
                    className="layer-name"
                  />
                  <button className="btn-danger-small" onClick={() => removeLayer(index)}>
                    🗑️
                  </button>
                </div>

                <div className="layer-config">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Max Attempts</label>
                      <input 
                        type="number" 
                        value={layer.maxAttempts}
                        onChange={(e) => updateLayer(index, 'maxAttempts', parseInt(e.target.value))}
                        min="1"
                        max="10"
                      />
                    </div>

                    <div className="form-group">
                      <label>Strategy</label>
                      <select 
                        value={layer.strategy}
                        onChange={(e) => updateLayer(index, 'strategy', e.target.value)}
                      >
                        <option value="pattern_detection">Pattern Detection</option>
                        <option value="progressive_refinement">Progressive Refinement</option>
                        <option value="random_sampling">Random Sampling</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>On Success</label>
                      <select 
                        value={layer.onSuccess}
                        onChange={(e) => updateLayer(index, 'onSuccess', e.target.value)}
                      >
                        <option value="return_best">Return Best</option>
                        <option value="escalate">Escalate</option>
                        <option value="continue">Continue</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>On Failure</label>
                      <select 
                        value={layer.onFailure}
                        onChange={(e) => updateLayer(index, 'onFailure', e.target.value)}
                      >
                        <option value="return_best">Return Best</option>
                        <option value="escalate">Escalate</option>
                        <option value="fail">Fail</option>
                      </select>
                    </div>
                  </div>

                  <div className="patterns-section">
                    <div className="patterns-header">
                      <label>Error Patterns</label>
                      <button className="btn-small" onClick={() => addPattern(index)}>
                        ➕ Add Pattern
                      </button>
                    </div>
                    {layer.patterns && layer.patterns.map((pattern, pIndex) => (
                      <div key={pIndex} className="pattern-row">
                        <select 
                          value={pattern.pattern}
                          onChange={(e) => {
                            const layers = [...workflow.iterativeWrapper.layers];
                            layers[index].patterns[pIndex].pattern = e.target.value;
                            updateWorkflow('iterativeWrapper.layers', layers);
                          }}
                        >
                          <option value="NO_ITEMS">NO_ITEMS</option>
                          <option value="PARSE_ERROR">PARSE_ERROR</option>
                          <option value="PARTIAL_SUCCESS">PARTIAL_SUCCESS</option>
                          <option value="TIMEOUT">TIMEOUT</option>
                          <option value="NETWORK_ERROR">NETWORK_ERROR</option>
                          <option value="INVALID_SELECTOR">INVALID_SELECTOR</option>
                        </select>
                        <input 
                          type="text" 
                          placeholder="Fix strategy"
                          value={pattern.fix}
                          onChange={(e) => {
                            const layers = [...workflow.iterativeWrapper.layers];
                            layers[index].patterns[pIndex].fix = e.target.value;
                            updateWorkflow('iterativeWrapper.layers', layers);
                          }}
                        />
                        <label>
                          <input 
                            type="checkbox" 
                            checked={pattern.escalate}
                            onChange={(e) => {
                              const layers = [...workflow.iterativeWrapper.layers];
                              layers[index].patterns[pIndex].escalate = e.target.checked;
                              updateWorkflow('iterativeWrapper.layers', layers);
                            }}
                          />
                          Escalate
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'agent' && (
          <div className="tab-content">
            <div className="form-group">
              <label>Agent Name</label>
              <input 
                type="text" 
                value={workflow.agent.name}
                onChange={(e) => updateWorkflow('agent.name', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Model</label>
              <select 
                value={workflow.agent.model}
                onChange={(e) => updateWorkflow('agent.model', e.target.value)}
              >
                <option value="llama3-groq-tool-use">Llama 3 Groq (Tool Use)</option>
                <option value="mistral-nemo">Mistral Nemo</option>
                <option value="deepseek-coder">DeepSeek Coder</option>
                <option value="codellama">CodeLlama</option>
              </select>
            </div>

            <div className="form-group">
              <label>Temperature: {workflow.agent.temperature}</label>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1"
                value={workflow.agent.temperature}
                onChange={(e) => updateWorkflow('agent.temperature', parseFloat(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label>System Prompt</label>
              <textarea 
                value={workflow.agent.systemPrompt}
                onChange={(e) => updateWorkflow('agent.systemPrompt', e.target.value)}
                rows="6"
                placeholder="You are an expert AI agent..."
              />
            </div>
          </div>
        )}

        {activeTab === 'tools' && (
          <div className="tab-content">
            <h3>Available Tools</h3>
            <p className="hint">Select the tools this agent can use</p>

            <div className="tools-grid">
              {tools.map((tool, index) => (
                <div 
                  key={index} 
                  className={`tool-card ${workflow.agent.tools.includes(tool.name) ? 'selected' : ''}`}
                  onClick={() => toggleTool(tool.name)}
                >
                  <div className="tool-checkbox">
                    <input 
                      type="checkbox" 
                      checked={workflow.agent.tools.includes(tool.name)}
                      onChange={() => {}}
                    />
                  </div>
                  <div className="tool-info">
                    <h4>{tool.name}</h4>
                    <p>{tool.description}</p>
                    {tool.dependencies && tool.dependencies.length > 0 && (
                      <span className="tool-deps">Requires: {tool.dependencies.join(', ')}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'validation' && (
          <div className="tab-content">
            <div className="form-group">
              <label>Validator</label>
              <select 
                value={workflow.validation.name}
                onChange={(e) => updateWorkflow('validation.name', e.target.value)}
              >
                {validators.map((v, i) => (
                  <option key={i} value={v.name}>{v.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Type</label>
              <select 
                value={workflow.validation.type}
                onChange={(e) => updateWorkflow('validation.type', e.target.value)}
              >
                <option value="custom">Custom</option>
                <option value="schema">JSON Schema</option>
                <option value="field_coverage">Field Coverage</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ToolManager = ({ tools, onUpdate }) => {
  const [newTool, setNewTool] = useState(null);
  const [editingTool, setEditingTool] = useState(null);

  const createLLMTool = () => {
    setNewTool({
      name: '',
      type: 'llm_query',
      description: '',
      model: 'llama3-groq-tool-use',
      endpoint: 'http://localhost:11434/api/generate',
      schema: {}
    });
  };

  const createCustomTool = () => {
    setNewTool({
      name: '',
      type: 'custom',
      description: '',
      schema: {},
      code: '// Tool implementation\nasync function execute(params) {\n  // Your code here\n  return result;\n}'
    });
  };

  const saveTool = async () => {
    try {
      await fetch('http://localhost:3003/iaf/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTool || editingTool)
      });
      alert('Tool saved!');
      setNewTool(null);
      setEditingTool(null);
      onUpdate();
    } catch (error) {
      alert('Failed to save tool: ' + error.message);
    }
  };

  if (newTool || editingTool) {
    const tool = newTool || editingTool;
    return (
      <div className="tool-editor">
        <h2>{newTool ? 'Create New Tool' : 'Edit Tool'}</h2>
        
        <div className="form-group">
          <label>Tool Name</label>
          <input 
            type="text" 
            value={tool.name}
            onChange={(e) => {
              const updated = { ...tool, name: e.target.value };
              newTool ? setNewTool(updated) : setEditingTool(updated);
            }}
            placeholder="my_custom_tool"
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea 
            value={tool.description}
            onChange={(e) => {
              const updated = { ...tool, description: e.target.value };
              newTool ? setNewTool(updated) : setEditingTool(updated);
            }}
            rows="2"
          />
        </div>

        {tool.type === 'llm_query' && (
          <>
            <div className="form-group">
              <label>Model</label>
              <input 
                type="text" 
                value={tool.model}
                onChange={(e) => {
                  const updated = { ...tool, model: e.target.value };
                  newTool ? setNewTool(updated) : setEditingTool(updated);
                }}
              />
            </div>

            <div className="form-group">
              <label>Endpoint</label>
              <input 
                type="text" 
                value={tool.endpoint}
                onChange={(e) => {
                  const updated = { ...tool, endpoint: e.target.value };
                  newTool ? setNewTool(updated) : setEditingTool(updated);
                }}
              />
            </div>
          </>
        )}

        {tool.type === 'custom' && (
          <div className="form-group">
            <label>Implementation Code</label>
            <textarea 
              value={tool.code}
              onChange={(e) => {
                const updated = { ...tool, code: e.target.value };
                newTool ? setNewTool(updated) : setEditingTool(updated);
              }}
              rows="10"
              className="code-editor"
            />
          </div>
        )}

        <div className="tool-editor-actions">
          <button className="btn-secondary" onClick={() => { setNewTool(null); setEditingTool(null); }}>
            Cancel
          </button>
          <button className="btn-primary" onClick={saveTool}>
            Save Tool
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tool-manager">
      <div className="manager-header">
        <h2>Tool Registry</h2>
        <div>
          <button className="btn-secondary" onClick={createLLMTool}>
            ➕ Add LLM Tool
          </button>
          <button className="btn-primary" onClick={createCustomTool}>
            ➕ Add Custom Tool
          </button>
        </div>
      </div>

      <div className="tools-list">
        {tools.map((tool, index) => (
          <div key={index} className="tool-list-item">
            <div className="tool-info">
              <h3>{tool.name}</h3>
              <p>{tool.description}</p>
              {tool.metadata && <span className="tool-type">{tool.metadata.type || 'builtin'}</span>}
            </div>
            <div className="tool-actions">
              <button onClick={() => setEditingTool(tool)}>✏️ Edit</button>
              <button className="btn-danger-small">🗑️ Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const WorkflowTester = ({ workflow }) => {
  const [testInput, setTestInput] = useState({
    task: '',
    config: {}
  });
  const [testResult, setTestResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState([]);

  const runTest = async () => {
    setIsRunning(true);
    setProgress([]);
    setTestResult(null);

    try {
      const response = await fetch('http://localhost:3003/iaf/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow,
          input: testInput
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'progress') {
              setProgress(prev => [...prev, data]);
            } else if (data.type === 'result') {
              setTestResult(data);
            }
          }
        }
      }
    } catch (error) {
      alert('Test failed: ' + error.message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="workflow-tester">
      <h2>Test Workflow: {workflow.name}</h2>

      <div className="test-input">
        <div className="form-group">
          <label>Task Description</label>
          <textarea 
            value={testInput.task}
            onChange={(e) => setTestInput({ ...testInput, task: e.target.value })}
            rows="3"
            placeholder="E.g., Build a scraper for https://example.com"
          />
        </div>

        <div className="form-group">
          <label>Configuration (JSON)</label>
          <textarea 
            value={JSON.stringify(testInput.config, null, 2)}
            onChange={(e) => {
              try {
                setTestInput({ ...testInput, config: JSON.parse(e.target.value) });
              } catch (err) {}
            }}
            rows="5"
            placeholder='{ "fieldsRequired": ["title", "url"] }'
          />
        </div>

        <button 
          className="btn-primary btn-large" 
          onClick={runTest}
          disabled={isRunning}
        >
          {isRunning ? '⏳ Running...' : '▶️ Run Test'}
        </button>
      </div>

      {progress.length > 0 && (
        <div className="test-progress">
          <h3>Execution Progress</h3>
          <div className="progress-log">
            {progress.map((p, i) => (
              <div key={i} className="progress-item">
                <span className="progress-time">{new Date(p.timestamp).toLocaleTimeString()}</span>
                <span className={`progress-status status-${p.status}`}>{p.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {testResult && (
        <div className="test-result">
          <h3>Test Result</h3>
          <div className={`result-card ${testResult.success ? 'success' : 'failure'}`}>
            <div className="result-summary">
              <span>Status: {testResult.success ? '✅ Success' : '❌ Failed'}</span>
              <span>Validated: {testResult.validated ? '✅' : '❌'}</span>
              <span>Total Attempts: {testResult.totalAttempts}</span>
            </div>
            <div className="result-details">
              <pre>{JSON.stringify(testResult.diagnostics, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowBuilder;
