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
      this.emit('event', event as AgentEngineEvent);
    };
    this.client.on('event', this.boundEventHandler);
  }

  public async connect(): Promise<void> {
    this.client.connectEventStream();
  }

  public disconnect(): void {
    this.client.disconnectEventStream();
  }

  public async createSession(options?: AgentSessionOptions): Promise<AgentSession> {
    const session = await this.client.createSession(options?.title);
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
    await this.client.submitPrompt(sessionId, prompt, agent, model);
  }

  public async abortSession(sessionId: string): Promise<void> {
    await this.client.abortSession(sessionId);
  }

  public async replyPermission(
    permissionId: string,
    decision: 'allow' | 'reject'
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
}
