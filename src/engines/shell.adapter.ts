/**
 * Shell / Generic CLI Agent Engine Adapter for AgentGram
 * Executes coding tasks and subagents via CLI processes (e.g. Claude Code, Aider, Codex, or Bash).
 * Pure Node.js with zero runtime dependencies.
 */
import * as child_process from 'node:child_process';
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
  private activeProcess?: child_process.ChildProcess;
  private activeSessionId?: string;

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

    if (this.cliCommand === 'claude') {
      args.push('-p', prompt);
    } else if (this.cliCommand === 'aider') {
      args.push('--message', prompt, '--yes');
    } else if (this.cliCommand === 'sh' || this.cliCommand === 'bash') {
      args = ['-c', prompt];
    } else {
      args.push(prompt);
    }

    const toolId = `tool-${Date.now()}`;
    this.emit('event', {
      type: 'tool.execute',
      properties: {
        id: toolId,
        tool: this.cliCommand,
        title: `Running: ${prompt.slice(0, 60)}`,
        metadata: { command: `${command} ${args.join(' ')}` },
      },
    } as AgentEngineEvent);

    return new Promise((resolve, reject) => {
      try {
        const proc = child_process.spawn(command, args, {
          cwd: this.workspaceDir,
          shell: this.cliCommand === 'sh' || this.cliCommand === 'bash',
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env },
        });

        this.activeProcess = proc;
        let stdout = '';
        let stderr = '';

        proc.stdout?.on('data', (data) => {
          stdout += data.toString();
        });

        proc.stderr?.on('data', (data) => {
          stderr += data.toString();
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
              output: stdout.slice(-2000),
              error: code === 0 ? undefined : stderr.slice(-1000),
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
    _decision: 'allow' | 'reject'
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
