/**
 * Shell / Generic CLI Agent Engine Adapter for AgentGram
 * Executes coding tasks and subagents via CLI processes (e.g. Claude Code, Aider, Codex, or Bash).
 * Pure Node.js with zero runtime dependencies.
 */
import * as child_process from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import type {
  IAgentEngine,
  AgentSession,
  AgentSessionOptions,
  AgentEngineEvent,
  AgentExecutionOptions,
} from './engine.interface.js';

export interface ShellEngineOptions {
  workspaceDir?: string;
  cliCommand?: string; // e.g. 'claude', 'aider', 'sh'
  args?: string[];
  promptArgs?: string[];
  env?: Record<string, string>;
}

export class ShellEngineAdapter extends EventEmitter implements IAgentEngine {
  public readonly id = 'shell';
  public readonly name: string;
  public workspaceDir: string;
  private readonly cliCommand: string;
  private readonly defaultArgs: string[];
  private readonly promptArgs: string[] | undefined;
  private activeProcess?: child_process.ChildProcess | undefined;
  public activeSessionId?: string | undefined;
  private pendingPermission: { id: string; resolve: (allow: boolean) => void } | undefined;
  private running = false;
  private cancelled = false;
  private stopping: Promise<void> | undefined;
  private readonly childEnv: Record<string, string> | undefined;

  constructor(options: ShellEngineOptions = {}) {
    super();
    this.workspaceDir = options.workspaceDir || process.cwd();
    this.cliCommand = options.cliCommand || 'sh';
    this.defaultArgs = options.args || [];
    this.promptArgs = options.promptArgs;
    this.name = `CLI (${this.cliCommand})`;
    this.childEnv = options.env;
  }

  public async connect(): Promise<void> {
    // Ready for process execution
  }

  public async disconnect(): Promise<void> {
    await this.abortSession(this.activeSessionId || '');
  }

  public async createSession(options?: AgentSessionOptions): Promise<AgentSession> {
    const id = `session-${randomUUID()}`;
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
    _model?: string,
    execution?: AgentExecutionOptions
  ): Promise<void> {
    if (this.running || this.stopping) throw new Error('A CLI operation is already active.');
    if (execution?.mode === 'read') {
      throw new Error('Read mode refuses CLI execution: this engine cannot enforce read-only tool access.');
    }
    this.activeSessionId = sessionId;

    let command = this.cliCommand;
    let args = [...this.defaultArgs];
    let resolvedPrompt = prompt.trim();

    // 1. Resolve well-known skill scripts if running via sh/bash
    if (this.promptArgs === undefined && (this.cliCommand === 'sh' || this.cliCommand === 'bash')) {
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

    if (this.promptArgs !== undefined) {
      args.push(...this.promptArgs.map((arg) => arg.replaceAll('{prompt}', () => resolvedPrompt)));
    } else if (this.cliCommand === 'claude') {
      args.push('-p', resolvedPrompt);
    } else if (this.cliCommand === 'aider') {
      args.push('--message', resolvedPrompt, '--yes');
    } else if (this.cliCommand === 'sh' || this.cliCommand === 'bash') {
      args = ['-c', resolvedPrompt];
    } else {
      args.push(resolvedPrompt);
    }

    const toolId = `tool-${randomUUID()}`;
    const cmdPreview = `${command} ${args.join(' ')}`;
    this.running = true;
    this.cancelled = false;
    const timeoutMs = execution?.timeoutMs ?? 300000;
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      this.running = false;
      throw new Error('CLI execution needs a positive finite timeout.');
    }
    // Omitted options preserve trusted direct API invocations. The control room always supplies its mode.
    if (execution) {
      const permissionId = `per_${randomUUID()}`;
      const allowed = await new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => {
          this.pendingPermission = undefined;
          resolve(false);
        }, timeoutMs);
        this.pendingPermission = { id: permissionId, resolve: (allow) => { clearTimeout(timer); resolve(allow); } };
        this.emit('event', { type: 'permission.ask', properties: {
          id: permissionId, permission: 'bash', metadata: {
            command: this.cliCommand === 'sh' || this.cliCommand === 'bash' ? resolvedPrompt : cmdPreview,
          },
        } });
      });
      this.pendingPermission = undefined;
      if (!allowed || this.cancelled) {
        this.running = false;
        this.emit('event', { type: 'step_finish', properties: {
          id: toolId, status: this.cancelled ? 'aborted' : 'error', error: 'CLI execution was not approved.',
        } });
        return;
      }
    }
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
      let timer: NodeJS.Timeout | undefined;
      try {
        const isShell = this.promptArgs === undefined && (this.cliCommand === 'sh' || this.cliCommand === 'bash');
        const proc = isShell
          ? child_process.spawn(resolvedPrompt, [], {
              cwd: this.workspaceDir,
              shell: true,
              stdio: ['pipe', 'pipe', 'pipe'],
              env: { ...process.env },
              detached: process.platform !== 'win32',
            })
          : child_process.spawn(command, args, {
              cwd: this.workspaceDir,
              shell: false,
              stdio: ['pipe', 'pipe', 'pipe'],
              env: { ...process.env, ...this.childEnv },
              detached: process.platform !== 'win32',
            });

        // Close stdin immediately so commands never block on interactive read(0)
        try {
          proc.stdin?.end();
        } catch {}

        this.activeProcess = proc;
        timer = setTimeout(() => { void this.abortSession(sessionId); }, timeoutMs);
        let stdout = '';
        let stderr = '';

        proc.stdout?.on('data', (data) => {
          const chunk = data.toString();
          stdout = (stdout + chunk).slice(-65536);
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
          stderr = (stderr + chunk).slice(-65536);
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
          clearTimeout(timer);
          this.running = false;
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
          clearTimeout(timer);
          if (this.activeProcess === proc) this.activeProcess = undefined;
          this.running = false;
          if (this.cancelled) { resolve(); return; }
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
        clearTimeout(timer);
        this.running = false;
        this.activeProcess = undefined;
        reject(err);
      }
    });
  }

  public async abortSession(sessionId: string): Promise<void> {
    if (sessionId !== this.activeSessionId) return;
    if (this.stopping) return this.stopping;
    this.cancelled = true;
    if (this.pendingPermission) {
      this.pendingPermission.resolve(false);
      this.pendingPermission = undefined;
      return;
    }
    const proc = this.activeProcess;
    if (!proc?.pid) return;
    const pid = proc.pid;
    this.stopping = (async () => {
      if (process.platform === 'win32') {
        await new Promise<void>((resolve, reject) => {
          const killer = child_process.spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' });
          killer.once('error', reject);
          killer.once('close', (code) => code === 0 ? resolve() : reject(new Error('Could not terminate the CLI process tree.')));
        });
      } else {
        const signalGroup = (signal: NodeJS.Signals) => {
          try { process.kill(-pid, signal); }
          catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error; }
        };
        signalGroup('SIGTERM');
        await new Promise((resolve) => setTimeout(resolve, 200));
        signalGroup('SIGKILL');
      }
      if (proc.exitCode === null && proc.signalCode === null) {
        await new Promise<void>((resolve) => proc.once('close', () => resolve()));
      }
      this.running = false;
      this.emit('event', { type: 'step_finish', properties: { status: 'aborted' } });
    })();
    try { await this.stopping; } finally { this.stopping = undefined; }
  }

  public async replyPermission(
    permissionId: string,
    decision: 'allow' | 'always' | 'reject'
  ): Promise<void> {
    if (this.pendingPermission?.id !== permissionId) throw new Error('Unknown or expired CLI permission request.');
    this.pendingPermission.resolve(decision !== 'reject');
    this.pendingPermission = undefined;
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
