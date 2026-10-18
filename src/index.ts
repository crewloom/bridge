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

// Re-export Telegram Bot Client
export { TelegramClient, escapeHtml } from './telegram/telegram-client.js';

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

// Re-export CLI & Version
export { runCli, VERSION } from './cli/index.js';

// Auto-run CLI if invoked directly via terminal / npx
if (typeof require !== 'undefined' && require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  const { runCli: cliMain } = require('./cli/index.js');
  cliMain().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
