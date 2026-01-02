import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

interface TraceData {
  id: string;
  type: string;
  input: any;
  output?: any;
  context?: string;
  sessionId?: string | null;
  startTime: number;
  endTime?: number;
  executionTime?: number;
  success?: boolean;
  error?: string;
  tokenCount?: number;
  steps: TraceStep[];
}

interface TraceStep {
  type: 'tool_start' | 'tool_end' | 'llm_start' | 'llm_end';
  timestamp: number;
  data: any;
}

class LocalTracer {
  private traces: Map<string, TraceData> = new Map();
  private tracesDir: string;

  constructor() {
    // Store traces in scraper-backend/traces directory
    this.tracesDir = path.join(process.cwd(), 'traces');
    if (!fs.existsSync(this.tracesDir)) {
      fs.mkdirSync(this.tracesDir, { recursive: true });
    }
    console.log('✅ Local tracer initialized (fully offline)');
  }

  startTrace(data: Partial<TraceData>): string {
    const traceId = randomUUID();
    const trace: TraceData = {
      id: traceId,
      type: data.type || 'unknown',
      input: data.input,
      context: data.context,
      sessionId: data.sessionId,
      startTime: Date.now(),
      steps: []
    };
    
    this.traces.set(traceId, trace);
    return traceId;
  }

  addStep(traceId: string, step: TraceStep) {
    const trace = this.traces.get(traceId);
    if (trace) {
      trace.steps.push(step);
    }
  }

  endTrace(traceId: string, result: { success: boolean; output?: any; error?: string; executionTime: number; tokenCount?: number }) {
    const trace = this.traces.get(traceId);
    if (!trace) return;

    trace.endTime = Date.now();
    trace.executionTime = result.executionTime;
    trace.success = result.success;
    trace.output = result.output;
    trace.error = result.error;
    trace.tokenCount = result.tokenCount;

    // Save to disk (JSON file per trace)
    const filename = `${trace.startTime}-${traceId}.json`;
    const filepath = path.join(this.tracesDir, filename);
    
    try {
      fs.writeFileSync(filepath, JSON.stringify(trace, null, 2));
      console.log(`💾 Trace saved: ${filename}`);
    } catch (error: any) {
      console.error(`❌ Failed to save trace: ${error.message}`);
    }

    // Clean up old traces (keep last 100)
    this.cleanupOldTraces();
  }

  private cleanupOldTraces() {
    try {
      const files = fs.readdirSync(this.tracesDir)
        .filter(f => f.endsWith('.json'))
        .map(f => ({
          name: f,
          path: path.join(this.tracesDir, f),
          time: fs.statSync(path.join(this.tracesDir, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);

      // Keep only the 100 most recent traces
      if (files.length > 100) {
        files.slice(100).forEach(file => {
          fs.unlinkSync(file.path);
        });
        console.log(`🧹 Cleaned up ${files.length - 100} old traces`);
      }
    } catch (error: any) {
      console.error(`❌ Cleanup error: ${error.message}`);
    }
  }

  getTrace(traceId: string): TraceData | null {
    // Check memory first
    const memTrace = this.traces.get(traceId);
    if (memTrace) return memTrace;

    // Check disk
    try {
      const files = fs.readdirSync(this.tracesDir);
      const traceFile = files.find(f => f.includes(traceId));
      if (traceFile) {
        const filepath = path.join(this.tracesDir, traceFile);
        const data = fs.readFileSync(filepath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error: any) {
      console.error(`❌ Failed to read trace: ${error.message}`);
    }

    return null;
  }

  listTraces(limit: number = 20): TraceData[] {
    try {
      const files = fs.readdirSync(this.tracesDir)
        .filter(f => f.endsWith('.json'))
        .map(f => {
          const filepath = path.join(this.tracesDir, f);
          const stat = fs.statSync(filepath);
          return { path: filepath, time: stat.mtime.getTime() };
        })
        .sort((a, b) => b.time - a.time)
        .slice(0, limit);

      return files.map(file => {
        const data = fs.readFileSync(file.path, 'utf-8');
        return JSON.parse(data);
      });
    } catch (error: any) {
      console.error(`❌ Failed to list traces: ${error.message}`);
      return [];
    }
  }

  getStats() {
    const traces = this.listTraces(1000); // Get last 1000 for stats
    const successful = traces.filter(t => t.success).length;
    const failed = traces.filter(t => !t.success).length;
    const avgTime = traces.reduce((sum, t) => sum + (t.executionTime || 0), 0) / traces.length || 0;
    const totalTokens = traces.reduce((sum, t) => sum + (t.tokenCount || 0), 0);

    return {
      total: traces.length,
      successful,
      failed,
      successRate: (successful / traces.length * 100).toFixed(1) + '%',
      avgExecutionTime: Math.round(avgTime) + 'ms',
      totalTokens: totalTokens
    };
  }
}

export const localTracer = new LocalTracer();
