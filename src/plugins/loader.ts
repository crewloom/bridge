import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { AgentgramConfig } from '../domain/types.js';
import { ChannelRegistry } from '../channels/registry.js';
import { EngineRegistry } from '../engines/registry.js';
import { parsePlugins } from '../config/extensions.js';

export interface BridgePluginContext {
  channels: typeof ChannelRegistry;
  engines: typeof EngineRegistry;
  config: AgentgramConfig;
}

export interface BridgePlugin {
  register(context: BridgePluginContext): void | Promise<void>;
}

/** Load trusted local code only. Plugins have the same privileges as the bridge. */
export async function loadPlugins(config: AgentgramConfig): Promise<void> {
  for (const specifier of parsePlugins(config.plugins || [])) {
    const filename = path.resolve(config.targetDir, specifier);
    if (!['.js', '.mjs', '.cjs'].includes(path.extname(filename))) {
      throw new Error('Bridge plugins must be local .js, .mjs, or .cjs files.');
    }
    const loaded = await import(pathToFileURL(filename).href);
    const plugin: unknown = loaded.default ?? loaded;
    if ((typeof plugin !== 'object' && typeof plugin !== 'function') || plugin === null ||
        !('register' in plugin) || typeof plugin.register !== 'function') {
      throw new Error(`Bridge plugin ${path.basename(filename)} must export register(context).`);
    }
    await plugin.register({ channels: ChannelRegistry, engines: EngineRegistry, config });
  }
}
