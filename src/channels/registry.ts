/**
 * Pluggable Channel Adapter Registry
 * Pure Node.js with zero runtime dependencies.
 */
import type { IChannelAdapter } from './channel.interface.js';
import type { AgentgramConfig } from '../domain/types.js';
import { TelegramChannelAdapter } from './telegram.adapter.js';
import { ConsoleChannelAdapter } from './console.adapter.js';

export type ChannelFactory = (config: AgentgramConfig) => IChannelAdapter;

export class ChannelRegistry {
  private static factories: Map<string, ChannelFactory> = new Map();

  static {
    // Register standard out-of-the-box channels
    this.register('telegram', (cfg) => new TelegramChannelAdapter(cfg.botToken));
    this.register('console', () => new ConsoleChannelAdapter());
  }

  public static register(id: string, factory: ChannelFactory): void {
    this.factories.set(id.toLowerCase(), factory);
  }

  public static get(id: string, config: AgentgramConfig): IChannelAdapter {
    const key = id.toLowerCase();
    const factory = this.factories.get(key);
    if (!factory) {
      const available = Array.from(this.factories.keys()).join(', ');
      throw new Error(`Unknown channel adapter: "${id}". Available channels: ${available}`);
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
