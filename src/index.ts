/**
 * AgentGram — AI Agent Control Room for Telegram
 * Pure Node.js & TypeScript with zero runtime dependencies.
 */

// Re-export Domain Types
export * from './domain/types.js';

// Re-export Security Engine
export { SecurityPolicy, DEFAULT_DENY_PATTERNS } from './security/policy.js';
export { PromptInjectionGuard } from './security/prompt-guard.js';

// Re-export Configuration & Persistence
export {
  ConfigManager,
  getGlobalConfigDir,
  ensureConfigDirs,
  computeWorkspaceId,
  AGENTGRAM_CONFIG_DIR,
  LEGACY_CONFIG_DIR,
} from './config/config-manager.js';

// Re-export Communication Channels (Telegram, Console, Custom)
export * from './channels/index.js';

// Re-export AI Coding Engines (OpenCode, Shell/Claude/Aider, Custom)
export * from './engines/index.js';
export { loadPlugins, type BridgePlugin, type BridgePluginContext } from './plugins/loader.js';

// Re-export Telegram Bot Client
export { TelegramClient, escapeHtml, stripHtml, splitTextSafely, type SendMessageOptions } from './telegram/telegram-client.js';

// Re-export OpenCode Integration
export { OpenCodeClient, type OpenCodeEvent, getFreePort } from './opencode/opencode-client.js';

// Re-export Mission Control & State Machine
export {
  ControlRoom,
  SYSTEM_HEADER,
  decidePermission,
  permissionKeyboard,
  parseCallback,
} from './control-room/control-room.js';

// Re-export Service Manager
export {
  ServiceManager,
  getEntryPoint,
  MACOS_PLIST_NAME,
  LINUX_SERVICE_NAME,
} from './service/service-manager.js';

// Re-export Localization Engine
export { t, TRANSLATIONS, TRANSLATIONS as translations, type Language, type TranslationKey } from './i18n/index.js';

// Re-export Constants & Versioning Single Source of Truth
export {
  APP_NAME,
  APP_VERSION,
  APP_DISPLAY_NAME,
  APP_MISSION_CONTROL_HEADER,
  APP_COMMANDS_HEADER,
  VERSION,
} from './constants.js';

// Re-export CLI
export { runCli } from './cli/index.js';

// Auto-run CLI if invoked directly via terminal / npx
if (typeof require !== 'undefined' && require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  const { runCli: cliMain } = require('./cli/index.js');
  cliMain().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
