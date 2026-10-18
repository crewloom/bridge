/**
 * AgentGram Pluggable AI Coding Agent Engine Contract
 * Hexagonal architecture port for AI coding engines & agent CLIs (OpenCode, Claude Code, Aider, Shell, etc.)
 * Pure Node.js with zero runtime dependencies.
 */
import type { EventEmitter } from 'node:events';

export interface AgentSession {
  id: string;
  workspaceDir: string;
  title?: string;
}

export interface AgentSessionOptions {
  workspaceDir?: string;
  title?: string;
  agent?: string;
  model?: string;
}

export interface AgentEngineToolCall {
  id: string;
  tool: string;
  status: 'running' | 'done' | 'error';
  args?: Record<string, unknown>;
  output?: string;
  title?: string;
}

export interface AgentEngineEvent {
  type: string;
  properties?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface IAgentEngine extends EventEmitter {
  readonly id: string;
  readonly name: string;
  workspaceDir: string;

  /**
   * Connect to or start the underlying agent engine server / runtime.
   */
  connect(): Promise<void>;

  /**
   * Disconnect or stop the agent engine server / processes.
   */
  disconnect(): Promise<void> | void;

  /**
   * Create or initialize a conversation session.
   */
  createSession(options?: AgentSessionOptions): Promise<AgentSession>;

  /**
   * Submit a coding task / prompt to the engine.
   */
  submitPrompt(
    sessionId: string,
    prompt: string,
    agent?: string,
    model?: string
  ): Promise<void>;

  /**
   * Abort or cancel an ongoing run.
   */
  abortSession(sessionId: string): Promise<void>;

  /**
   * Respond to an interactive tool execution permission request.
   */
  replyPermission(
    permissionId: string,
    decision: 'allow' | 'reject'
  ): Promise<void>;

  /**
   * Get working directory git diff / changes.
   */
  getDiff(): Promise<string>;

  /**
   * Switch the active working directory / workspace.
   */
  setWorkspace(directory: string): Promise<void> | void;
}
