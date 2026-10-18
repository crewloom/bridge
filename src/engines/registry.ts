/**
 * Pluggable AI Coding Agent Engine Registry
 * Pure Node.js with zero runtime dependencies.
 */
import type { IAgentEngine } from './engine.interface.js';
import type { AgentgramConfig } from '../domain/types.js';
import { OpenCodeAdapter } from './opencode.adapter.js';
import { ShellEngineAdapter } from './shell.adapter.js';

export type EngineFactory = (config: AgentgramConfig) => IAgentEngine;

export class EngineRegistry {
  private static factories: Map<string, EngineFactory> = new Map();

  static {
    // Register standard default coding engines
    this.register('opencode', (cfg) => new OpenCodeAdapter('http://127.0.0.1:4096', cfg.targetDir));
    this.register('shell', (cfg) => new ShellEngineAdapter({ workspaceDir: cfg.targetDir, cliCommand: 'sh' }));
    this.register('claude', (cfg) => new ShellEngineAdapter({ workspaceDir: cfg.targetDir, cliCommand: 'claude' }));
    this.register('aider', (cfg) => new ShellEngineAdapter({ workspaceDir: cfg.targetDir, cliCommand: 'aider' }));
  }

  public static register(id: string, factory: EngineFactory): void {
    this.factories.set(id.toLowerCase(), factory);
  }

  public static get(id: string, config: AgentgramConfig): IAgentEngine {
    const key = id.toLowerCase();
    const factory = this.factories.get(key);
    if (!factory) {
      const available = Array.from(this.factories.keys()).join(', ');
      throw new Error(`Unknown agent engine: "${id}". Available engines: ${available}`);
    }
    return factory(config);
  }

  public static has(id: string): boolean {
    return this.factories.has(id.toLowerCase());
  }

  public static list(): string[] {
    return Array.from(this.factories.keys());
  }
}
