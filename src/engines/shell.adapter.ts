/**
 * Shell / Generic CLI Agent Engine Adapter for AgentGram
 * Executes coding tasks and subagents via CLI processes (e.g. Claude Code, Aider, Codex, or Bash).
 * Pure Node.js with zero runtime dependencies.
 */
import * as child_process from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { EventEmitter } from 'node:events';
import type {
  IAgentEngine,
  AgentSession,
  AgentSessionOptions,
  AgentEngineEvent,
} from './engine.interface.js';

export interface ShellEngineOptions {
  workspaceDir?: string;
  cliCommand?: string; // e.g. 'claude', 'aider', 'sh'
  args?: string[];
  env?: Record<string, string>;
}

export class ShellEngineAdapter extends EventEmitter implements IAgentEngine {
  public readonly id = 'shell';
  public readonly name: string;
  public workspaceDir: string;
  private readonly cliCommand: string;
  private readonly defaultArgs: string[];
  private activeProcess?: child_process.ChildProcess | undefined;
  public activeSessionId?: string | undefined;

  constructor(options: ShellEngineOptions = {}) {
    super();
    this.workspaceDir = options.workspaceDir || process.cwd();
    this.cliCommand = options.cliCommand || 'sh';
    this.defaultArgs = options.args || [];
    this.name = `CLI (${this.cliCommand})`;
  }

  public async connect(): Promise<void> {
    // Ready for process execution
  }

  public disconnect(): void {
    if (this.activeProcess) {
      try {
        this.activeProcess.kill('SIGTERM');
      } catch {}
      this.activeProcess = undefined;
    }
  }

  public async createSession(options?: AgentSessionOptions): Promise<AgentSession> {
    const id = `session-${Date.now()}`;
    this.activeSessionId = id;
    if (options?.workspaceDir) {
      this.workspaceDir = options.workspaceDir;
    }
    return {
      id,
      workspaceDir: this.workspaceDir,
      title: options?.title || `CLI Task`,
    };
  }

  public async submitPrompt(
    sessionId: string,
    prompt: string,
    _agent?: string,
    _model?: string
  ): Promise<void> {
    this.activeSessionId = sessionId;

    let command = this.cliCommand;
    let args = [...this.defaultArgs];
    let resolvedPrompt = prompt.trim();

    // 1. Resolve well-known skill scripts if running via sh/bash
    if (this.cliCommand === 'sh' || this.cliCommand === 'bash') {
      const lower = resolvedPrompt.toLowerCase();
      if (lower.startsWith('/pinpoint_go') || lower.startsWith('/pinpoint-go') || lower === 'pinpoint_go' || lower === 'pinpoint-go') {
        const script = path.join(this.workspaceDir, 'tools', 'ai', 'pinpoint_go.sh');
        if (fs.existsSync(script)) {
          const extra = resolvedPrompt.replace(/^\/?pinpoint[-_]go\s*/i, '');
          resolvedPrompt = `bash tools/ai/pinpoint_go.sh ${extra}`.trim();
        }
      } else if (lower.startsWith('/query_perf') || lower.startsWith('/query-perf') || lower === 'query_perf' || lower === 'query-perf') {
        const script = path.join(this.workspaceDir, 'tools', 'ai', 'query_perf_audit.py');
        if (fs.existsSync(script)) {
          resolvedPrompt = `python3 tools/ai/query_perf_audit.py --all --summary`;
        }
      } else if (lower.startsWith('/verify_erp') || lower.startsWith('/verify-erp') || lower === 'verify_erp' || lower === 'verify-erp') {
        const script = path.join(this.workspaceDir, 'tools', 'ai', 'verify_erp_change.py');
        if (fs.existsSync(script)) {
          resolvedPrompt = `python3 tools/ai/verify_erp_change.py --check-docs`;
        }
      } else if (lower.startsWith('/validate_skills') || lower === 'validate_skills') {
        const script = path.join(this.workspaceDir, 'tools', 'ai', 'validate_skills.py');
        if (fs.existsSync(script)) {
          resolvedPrompt = `python3 tools/ai/validate_skills.py`;
        }
      } else if (lower.startsWith('/test_gates') || lower === 'test_gates') {
        const script = path.join(this.workspaceDir, 'tools', 'ai', 'test_gates.py');
        if (fs.existsSync(script)) {
          resolvedPrompt = `python3 tools/ai/test_gates.py`;
        }
      } else if (/[\u0600-\u06FF]/.test(resolvedPrompt)) {
        // Natural language query in Shell mode - don't pass to bash
        const toolId = `tool-${Date.now()}`;
        this.emit('event', {
          type: 'step_finish',
          properties: {
            id: toolId,
            status: 'done',
            output: `ℹ️ تم استلام رسالتك:\n"${resolvedPrompt}"\n\nالسيرفر يعمل ومتصل حياً (Online).\nلتنفيذ أمر مباشر على السيرفر اكتب الأمر (مثل: git status أو free -m).\nأو استخدم المهارات عبر القائمة بالضغط على / (مثل: /pinpoint_go أو /skills).`,
          },
        } as AgentEngineEvent);
        return;
      }
    }

    if (this.cliCommand === 'claude') {
      args.push('-p', resolvedPrompt);
    } else if (this.cliCommand === 'aider') {
      args.push('--message', resolvedPrompt, '--yes');
    } else if (this.cliCommand === 'sh' || this.cliCommand === 'bash') {
      args = ['-c', resolvedPrompt];
    } else {
      args.push(resolvedPrompt);
    }

    const toolId = `tool-${Date.now()}`;
    const cmdPreview = `${command} ${args.join(' ')}`;
    this.emit('event', {
      type: 'tool.execute',
      properties: {
        id: toolId,
        tool: this.cliCommand,
        title: `Running: ${resolvedPrompt.slice(0, 80)}`,
        metadata: { command: cmdPreview },
      },
    } as AgentEngineEvent);

    return new Promise((resolve, reject) => {
      try {
        const isShell = this.cliCommand === 'sh' || this.cliCommand === 'bash';
        const proc = isShell
          ? child_process.spawn(resolvedPrompt, [], {
              cwd: this.workspaceDir,
              shell: true,
              stdio: ['pipe', 'pipe', 'pipe'],
              env: { ...process.env },
            })
          : child_process.spawn(command, args, {
              cwd: this.workspaceDir,
              shell: false,
              stdio: ['pipe', 'pipe', 'pipe'],
              env: { ...process.env },
            });

        // Close stdin immediately so commands never block on interactive read(0)
        try {
          proc.stdin?.end();
        } catch {}

        this.activeProcess = proc;
        let stdout = '';
        let stderr = '';

        proc.stdout?.on('data', (data) => {
          const chunk = data.toString();
          stdout += chunk;
          this.emit('event', {
            type: 'tool.output',
            properties: {
              id: toolId,
              stream: 'stdout',
              chunk,
              tail: stdout.slice(-800),
            },
          } as AgentEngineEvent);
        });

        proc.stderr?.on('data', (data) => {
          const chunk = data.toString();
          stderr += chunk;
          this.emit('event', {
            type: 'tool.output',
            properties: {
              id: toolId,
              stream: 'stderr',
              chunk,
              tail: stderr.slice(-800),
            },
          } as AgentEngineEvent);
        });

        proc.on('error', (err) => {
          this.activeProcess = undefined;
          this.emit('event', {
            type: 'step_finish',
            properties: {
              id: toolId,
              status: 'error',
              error: err.message,
            },
          } as AgentEngineEvent);
          reject(err);
        });

        proc.on('close', (code) => {
          this.activeProcess = undefined;
          this.emit('event', {
            type: 'step_finish',
            properties: {
              id: toolId,
              status: code === 0 ? 'done' : 'error',
              code,
              output: stdout.slice(-3000),
              error: code === 0 ? undefined : (stderr || stdout).slice(-1500),
            },
          } as AgentEngineEvent);
          resolve();
        });
      } catch (err) {
        this.activeProcess = undefined;
        reject(err);
      }
    });
  }

  public async abortSession(_sessionId: string): Promise<void> {
    if (this.activeProcess) {
      try {
        this.activeProcess.kill('SIGTERM');
      } catch {}
      this.activeProcess = undefined;
    }
    this.emit('event', {
      type: 'step_finish',
      properties: {
        status: 'aborted',
      },
    } as AgentEngineEvent);
  }

  public async replyPermission(
    _permissionId: string,
    _decision: 'allow' | 'always' | 'reject'
  ): Promise<void> {
    // Shell process permission acknowledgement
  }

  public async getDiff(): Promise<string> {
    try {
      const res = child_process.spawnSync('git', ['diff', 'HEAD'], {
        cwd: this.workspaceDir,
        encoding: 'utf-8',
        timeout: 10000,
      });
      return res.stdout || '';
    } catch {
      return '';
    }
  }

  public setWorkspace(directory: string): void {
    this.workspaceDir = directory;
  }
}
