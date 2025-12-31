/**
 * Metrics Dashboard Component
 * 
 * Visualizes:
 * - Token usage over time (line chart)
 * - Model distribution (pie chart)
 * - Agent performance (bar chart)
 * - Response times (line chart)
 * - Real-time stats
 */

import Chart from 'chart.js/auto';
import MetricsService from '../services/MetricsService.js';

export class MetricsDashboard {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.charts = {};
    this.refreshInterval = null;
  }

  render() {
    this.container.innerHTML = `
      <div class="metrics-dashboard">
        <div class="metrics-header">
          <h2>📊 Analytics Dashboard</h2>
          <div class="metrics-controls">
            <select id="metrics-timeframe" class="metrics-select">
              <option value="1">Last 24 Hours</option>
              <option value="7" selected>Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
            </select>
            <button id="refresh-metrics" class="btn btn-secondary">
              🔄 Refresh
            </button>
            <button id="export-metrics" class="btn btn-secondary">
              💾 Export
            </button>
            <button id="clear-metrics" class="btn btn-danger">
              🗑️ Clear
            </button>
          </div>
        </div>

        <!-- Real-time Stats -->
        <div class="metrics-stats-grid">
          <div class="stat-card">
            <div class="stat-icon">🔢</div>
            <div class="stat-content">
              <div class="stat-label">Tokens (24h)</div>
              <div class="stat-value" id="stat-tokens">0</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">💬</div>
            <div class="stat-content">
              <div class="stat-label">Conversations</div>
              <div class="stat-value" id="stat-conversations">0</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">✅</div>
            <div class="stat-content">
              <div class="stat-label">Success Rate</div>
              <div class="stat-value" id="stat-success">0%</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">⚡</div>
            <div class="stat-content">
              <div class="stat-label">Avg Response</div>
              <div class="stat-value" id="stat-response">0ms</div>
            </div>
          </div>
        </div>

        <!-- Charts Grid -->
        <div class="metrics-charts-grid">
          <!-- Token Usage Chart -->
          <div class="chart-card">
            <div class="chart-header">
              <h3>📈 Token Usage</h3>
              <span class="chart-subtitle">Daily token consumption</span>
            </div>
            <div class="chart-container">
              <canvas id="tokens-chart"></canvas>
            </div>
          </div>

          <!-- Model Distribution Chart -->
          <div class="chart-card">
            <div class="chart-header">
              <h3>🤖 Model Distribution</h3>
              <span class="chart-subtitle">Usage by model</span>
            </div>
            <div class="chart-container">
              <canvas id="models-chart"></canvas>
            </div>
          </div>

          <!-- Response Time Chart -->
          <div class="chart-card">
            <div class="chart-header">
              <h3>⚡ Response Times</h3>
              <span class="chart-subtitle">Average daily response time</span>
            </div>
            <div class="chart-container">
              <canvas id="response-chart"></canvas>
            </div>
          </div>

          <!-- Agent Performance Chart -->
          <div class="chart-card">
            <div class="chart-header">
              <h3>🎯 Agent Performance</h3>
              <span class="chart-subtitle">Success vs failure rates</span>
            </div>
            <div class="chart-container">
              <canvas id="agents-chart"></canvas>
            </div>
          </div>
        </div>

        <!-- Detailed Tables -->
        <div class="metrics-tables">
          <div class="table-card">
            <h3>🔧 Agent Details</h3>
            <div class="table-scroll">
              <table id="agents-table" class="metrics-table">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Executions</th>
                    <th>Success Rate</th>
                    <th>Avg Duration</th>
                    <th>Last Error</th>
                  </tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
    this.initCharts();
    this.updateDashboard();
    this.startAutoRefresh();
  }

  attachEventListeners() {
    const timeframe = document.getElementById('metrics-timeframe');
    timeframe?.addEventListener('change', () => this.updateDashboard());

    const refresh = document.getElementById('refresh-metrics');
    refresh?.addEventListener('click', () => this.updateDashboard());

    const exportBtn = document.getElementById('export-metrics');
    exportBtn?.addEventListener('click', () => MetricsService.exportMetrics());

    const clearBtn = document.getElementById('clear-metrics');
    clearBtn?.addEventListener('click', () => {
      if (confirm('Clear all metrics? This cannot be undone.')) {
        MetricsService.clearMetrics();
        this.updateDashboard();
      }
    });
  }

  initCharts() {
    const chartOptions = {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          labels: { color: '#f1f5f9' }
        }
      },
      scales: {
        y: {
          ticks: { color: '#94a3b8' },
          grid: { color: '#334155' }
        },
        x: {
          ticks: { color: '#94a3b8' },
          grid: { color: '#334155' }
        }
      }
    };

    // Token Usage Chart
    const tokensCtx = document.getElementById('tokens-chart');
    if (tokensCtx) {
      this.charts.tokens = new Chart(tokensCtx, {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            label: 'Tokens Used',
            data: [],
            borderColor: '#4f46e5',
            backgroundColor: 'rgba(79, 70, 229, 0.1)',
            fill: true,
            tension: 0.4
          }]
        },
        options: chartOptions
      });
    }

    // Model Distribution Chart
    const modelsCtx = document.getElementById('models-chart');
    if (modelsCtx) {
      this.charts.models = new Chart(modelsCtx, {
        type: 'doughnut',
        data: {
          labels: [],
          datasets: [{
            data: [],
            backgroundColor: [
              '#4f46e5', '#06b6d4', '#10b981', 
              '#f59e0b', '#ef4444', '#8b5cf6',
              '#ec4899', '#14b8a6'
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              position: 'right',
              labels: { color: '#f1f5f9' }
            }
          }
        }
      });
    }

    // Response Time Chart
    const responseCtx = document.getElementById('response-chart');
    if (responseCtx) {
      this.charts.response = new Chart(responseCtx, {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            label: 'Avg Response Time (ms)',
            data: [],
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6, 182, 212, 0.1)',
            fill: true,
            tension: 0.4
          }]
        },
        options: chartOptions
      });
    }

    // Agent Performance Chart
    const agentsCtx = document.getElementById('agents-chart');
    if (agentsCtx) {
      this.charts.agents = new Chart(agentsCtx, {
        type: 'bar',
        data: {
          labels: [],
          datasets: [
            {
              label: 'Success',
              data: [],
              backgroundColor: '#10b981'
            },
            {
              label: 'Failure',
              data: [],
              backgroundColor: '#ef4444'
            }
          ]
        },
        options: {
          ...chartOptions,
          scales: {
            ...chartOptions.scales,
            x: {
              stacked: true,
              ticks: { color: '#94a3b8' },
              grid: { color: '#334155' }
            },
            y: {
              stacked: true,
              ticks: { color: '#94a3b8' },
              grid: { color: '#334155' }
            }
          }
        }
      });
    }
  }

  updateDashboard() {
    const timeframe = document.getElementById('metrics-timeframe')?.value || 7;
    const days = parseInt(timeframe);
    
    // Get aggregated metrics
    const metrics = MetricsService.getAggregatedMetrics(days);
    const realTime = MetricsService.getRealTimeStats();

    // Update real-time stats
    document.getElementById('stat-tokens').textContent = 
      realTime.tokensLast24h.toLocaleString();
    document.getElementById('stat-conversations').textContent = 
      realTime.totalConversations.toLocaleString();
    document.getElementById('stat-success').textContent = 
      realTime.successRate + '%';
    document.getElementById('stat-response').textContent = 
      realTime.avgResponseTime + 'ms';

    // Update Token Usage Chart
    if (this.charts.tokens) {
      const dates = Object.keys(metrics.tokensByDay).sort();
      this.charts.tokens.data.labels = dates;
      this.charts.tokens.data.datasets[0].data = dates.map(d => metrics.tokensByDay[d]);
      this.charts.tokens.update();
    }

    // Update Model Distribution Chart
    if (this.charts.models) {
      const models = Object.keys(metrics.modelDistribution);
      const counts = models.map(m => metrics.modelDistribution[m]);
      this.charts.models.data.labels = models;
      this.charts.models.data.datasets[0].data = counts;
      this.charts.models.update();
    }

    // Update Response Time Chart
    if (this.charts.response) {
      const dates = Object.keys(metrics.avgResponseTimesByDay).sort();
      this.charts.response.data.labels = dates;
      this.charts.response.data.datasets[0].data = 
        dates.map(d => metrics.avgResponseTimesByDay[d]);
      this.charts.response.update();
    }

    // Update Agent Performance Chart
    if (this.charts.agents) {
      const agents = Object.keys(metrics.agentPerformance);
      const successes = agents.map(a => metrics.agentPerformance[a].successes);
      const failures = agents.map(a => metrics.agentPerformance[a].failures);
      
      this.charts.agents.data.labels = agents;
      this.charts.agents.data.datasets[0].data = successes;
      this.charts.agents.data.datasets[1].data = failures;
      this.charts.agents.update();
    }

    // Update Agent Details Table
    this.updateAgentTable(metrics.agentPerformance);
  }

  updateAgentTable(agentPerformance) {
    const tbody = document.querySelector('#agents-table tbody');
    if (!tbody) return;

    const agents = Object.keys(agentPerformance);
    
    if (agents.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No agent data yet</td></tr>';
      return;
    }

    tbody.innerHTML = agents.map(name => {
      const perf = agentPerformance[name];
      const successRate = ((perf.successes / perf.executions) * 100).toFixed(1);
      const lastError = perf.errors.length > 0 
        ? perf.errors[perf.errors.length - 1].error.substring(0, 50) + '...'
        : 'None';

      return `
        <tr>
          <td><strong>${name}</strong></td>
          <td>${perf.executions}</td>
          <td>
            <span class="success-badge ${successRate > 80 ? 'high' : successRate > 50 ? 'medium' : 'low'}">
              ${successRate}%
            </span>
          </td>
          <td>${perf.avgDuration.toFixed(0)}ms</td>
          <td class="error-cell">${lastError}</td>
        </tr>
      `;
    }).join('');
  }

  startAutoRefresh() {
    // Refresh every 30 seconds
    this.refreshInterval = setInterval(() => {
      this.updateDashboard();
    }, 30000);
  }

  destroy() {
    // Clear interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    // Destroy charts
    Object.values(this.charts).forEach(chart => {
      if (chart) chart.destroy();
    });
    
    this.charts = {};
  }
}
