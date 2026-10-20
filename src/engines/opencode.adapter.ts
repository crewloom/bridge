/**
 * OpenCode Engine Adapter for AgentGram
 * Default production coding agent engine wrapping local loopback OpenCode server.
 * Pure Node.js with zero runtime dependencies.
 */
import { EventEmitter } from 'node:events';
import { OpenCodeClient, type OpenCodeEvent } from '../opencode/opencode-client.js';
import type {
  IAgentEngine,
  AgentSession,
  AgentSessionOptions,
  AgentEngineEvent,
} from './engine.interface.js';

export class OpenCodeAdapter extends EventEmitter implements IAgentEngine {
  public readonly id = 'opencode';
  public readonly name = 'OpenCode Agent';
  public workspaceDir: string;
  public client: OpenCodeClient;
  private readonly boundEventHandler: (event: OpenCodeEvent) => void;
  private activeSessionId: string | null = null;
  private accumulatedText = '';
  private readonly finishedSessions = new Set<string>();

  constructor(clientOrUrl: OpenCodeClient | string, workspaceDir?: string) {
    super();
    this.workspaceDir = workspaceDir || process.cwd();

    if (typeof clientOrUrl === 'string') {
      this.client = new OpenCodeClient(clientOrUrl, undefined, this.workspaceDir);
    } else {
      this.client = clientOrUrl;
      this.workspaceDir = this.client.directory || this.workspaceDir;
    }

    this.boundEventHandler = (event: OpenCodeEvent) => {
      this.handleOpenCodeEvent(event);
    };
    this.client.on('event', this.boundEventHandler);
  }

  private handleOpenCodeEvent(event: OpenCodeEvent): void {
    const type = event.type;
    const props = (event.properties || {}) as Record<string, unknown>;
    const sid = String(props.sessionID || event.sessionID || this.activeSessionId || '');

    // 1. Permission request event normalization (OpenCode emits 'permission.asked')
    if (type === 'permission.asked' || type === 'permission.ask') {
      const permId = String(
        (props.id && String(props.id).startsWith('per'))
          ? props.id
          : (props.requestID && String(props.requestID).startsWith('per'))
          ? props.requestID
          : (event.id && String(event.id).startsWith('per'))
          ? event.id
          : (props.id || props.requestID || event.id || '')
      );
      const permission = String(props.permission || event.permission || 'tool');
      const patterns = (props.patterns || event.patterns || ['*']) as string[];
      const metadata = (props.metadata || event.metadata || {}) as Record<string, unknown>;

      this.emit('event', {
        type: 'permission.ask',
        properties: {
          id: permId,
          permission,
          patterns,
          metadata,
        },
      } as AgentEngineEvent);
      return;
    }

    // 2. Tool execution and live output
    if (type === 'message.part.updated') {
      const part = (props.part || {}) as Record<string, unknown>;
      const partType = String(part.type || '');

      if (partType === 'tool') {
        const state = (part.state || {}) as Record<string, unknown>;
        const input = (state.input || {}) as Record<string, unknown>;
        const toolName = String(part.tool || 'tool');
        const toolId = String(part.callID || part.id || Math.random());
        const cmd = String(input.command || part.title || toolName);

        if (state.status === 'running') {
          this.emit('event', {
            type: 'tool.execute',
            properties: {
              id: toolId,
              tool: toolName,
              title: cmd,
              metadata: { command: cmd },
            },
          } as AgentEngineEvent);
        }

        if (state.output) {
          const outStr = String(state.output);
          this.emit('event', {
            type: 'tool.output',
            properties: {
              id: toolId,
              stream: 'stdout',
              chunk: outStr,
              tail: outStr.slice(-800),
            },
          } as AgentEngineEvent);
        }
      } else if (partType === 'text') {
        if (typeof part.text === 'string') {
          this.accumulatedText = part.text;
        }
      }
    }

    // 3. Streaming text deltas
    if (type === 'message.part.delta') {
      if (props.field === 'text' && typeof props.delta === 'string') {
        this.accumulatedText += props.delta;
      }
    }

    // 4. Session Error
    if (type === 'session.error') {
      const errObj = (props.error || {}) as Record<string, unknown>;
      const dataObj = (errObj.data || {}) as Record<string, unknown>;
      const errMsg = String(dataObj.message || errObj.message || errObj.name || 'OpenCode error');

      this.finishedSessions.add(sid);
      this.emit('event', {
        type: 'step_finish',
        properties: {
          sessionID: sid,
          status: 'error',
          error: errMsg,
          output: errMsg,
        },
      } as AgentEngineEvent);
      return;
    }

    // 5. Session Idle / Completion
    const isStatusIdle =
      type === 'session.status' &&
      typeof props.status === 'object' &&
      props.status !== null &&
      (props.status as Record<string, unknown>).type === 'idle';

    if (type === 'session.idle' || isStatusIdle) {
      if (sid && !this.finishedSessions.has(sid)) {
        this.finishedSessions.add(sid);
        this.emit('event', {
          type: 'step_finish',
          properties: {
            sessionID: sid,
            status: 'done',
            output: this.accumulatedText.trim(),
          },
        } as AgentEngineEvent);
      }
    }

    // Re-emit raw event for any direct low-level subscribers
    this.emit('event', event as AgentEngineEvent);
  }

  public async connect(): Promise<void> {
    this.client.connectEventStream();
  }

  public disconnect(): void {
    this.client.disconnectEventStream();
  }

  public async createSession(options?: AgentSessionOptions): Promise<AgentSession> {
    const session = await this.client.createSession(options?.title);
    this.activeSessionId = session.id;
    return {
      id: session.id,
      workspaceDir: this.workspaceDir,
      title: session.title,
    };
  }

  public async submitPrompt(
    sessionId: string,
    prompt: string,
    agent?: string,
    model?: string
  ): Promise<void> {
    this.activeSessionId = sessionId;
    this.accumulatedText = '';
    this.finishedSessions.delete(sessionId);
    await this.client.submitPrompt(sessionId, prompt, agent, model);
  }

  public async abortSession(sessionId: string): Promise<void> {
    await this.client.abortSession(sessionId);
    this.finishedSessions.add(sessionId);
    this.emit('event', {
      type: 'step_finish',
      properties: {
        sessionID: sessionId,
        status: 'aborted',
      },
    } as AgentEngineEvent);
  }

  public async replyPermission(
    permissionId: string,
    decision: 'allow' | 'always' | 'reject'
  ): Promise<void> {
    await this.client.replyPermission(permissionId, decision);
  }

  public async getDiff(): Promise<string> {
    return this.client.getDiff();
  }

  public setWorkspace(directory: string): void {
    this.workspaceDir = directory;
    this.client.disconnectEventStream();
    this.client.off('event', this.boundEventHandler);

    this.client = new OpenCodeClient(this.client.baseUrl, undefined, directory);
    this.client.on('event', this.boundEventHandler);
    this.client.connectEventStream();
  }

  public async listModels(): Promise<Array<{ id: string; name?: string }>> {
    return this.client.listModels();
  }

  public async listAgents(): Promise<Array<{ name: string; description?: string }>> {
    return this.client.listAgents();
  }
}
