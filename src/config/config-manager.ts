/**
 * Type-Safe Configuration & Workspace Manager
 * Pure Node.js implementation with zero external dependencies.
 */
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import type { AgentgramConfig } from '../domain/types.js';

export const LEGACY_CONFIG_DIR = path.join(os.homedir(), '.config', 'rumuze-edit');
export const AGENTGRAM_CONFIG_DIR = path.join(os.homedir(), '.config', 'agentgram');

export function getGlobalConfigDir(): string {
  if (process.env.AGENTGRAM_CONFIG_DIR) {
    return process.env.AGENTGRAM_CONFIG_DIR;
  }
  const agentgramConfigFile = path.join(AGENTGRAM_CONFIG_DIR, 'config.json');
  const legacyConfigFile = path.join(LEGACY_CONFIG_DIR, 'config.json');
  if (fs.existsSync(agentgramConfigFile)) {
    return AGENTGRAM_CONFIG_DIR;
  }
  if (fs.existsSync(legacyConfigFile)) {
    return LEGACY_CONFIG_DIR;
  }
  return AGENTGRAM_CONFIG_DIR;
}

export function ensureConfigDirs(): void {
  try {
    const targetDir = getGlobalConfigDir();
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true, mode: 0o700 });
    const stateDir = path.join(targetDir, 'state');
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true, mode: 0o700 });
    }

    // Auto-migrate legacy configuration if found
    if (!process.env.AGENTGRAM_CONFIG_DIR) {
      const legacyConfig = path.join(LEGACY_CONFIG_DIR, 'config.json');
      const agentgramConfig = path.join(AGENTGRAM_CONFIG_DIR, 'config.json');
      if (fs.existsSync(legacyConfig) && !fs.existsSync(agentgramConfig)) {
        try {
          fs.copyFileSync(legacyConfig, agentgramConfig);
        } catch {}
      }
    }
  } catch {
    // Ignore permission or creation race conditions
  }
}

export function computeWorkspaceId(directory: string): string {
  try {
    const real = fs.realpathSync(path.resolve(directory));
    const digest = crypto.createHash('sha256').update(real).digest('hex').slice(0, 12);
    const base = path.basename(real) || 'root';
    const safeName = base.replace(/[^a-zA-Z0-9_\-]/g, '_');
    return `${safeName}_${digest}`;
  } catch {
    const safe = path.basename(directory).replace(/[^a-zA-Z0-9_\-]/g, '_');
    return `${safe}_default`;
  }
}

export class ConfigManager {
  public config: AgentgramConfig;
  public readonly workspaceId: string;
  public readonly globalConfigPath: string;
  public readonly projectConfigPath: string;
  public readonly legacyProjectConfigPath: string;
  public readonly stateDir: string;
  public readonly roomStatePath: string;
  public readonly gatePath: string;
  public readonly auditPath: string;

  constructor(targetDir?: string, customConfigPath?: string) {
    ensureConfigDirs();
    const globalDir = getGlobalConfigDir();
    const resolvedTarget = targetDir ? path.resolve(targetDir) : process.cwd();

    this.workspaceId = computeWorkspaceId(resolvedTarget);
    this.globalConfigPath = customConfigPath || path.join(globalDir, 'config.json');
    this.projectConfigPath = path.join(resolvedTarget, '.agentgram.json');
    this.legacyProjectConfigPath = path.join(resolvedTarget, '.rumuze-edit.json');
    this.stateDir = path.join(globalDir, 'state');

    this.roomStatePath = path.join(this.stateDir, `${this.workspaceId}_room_state.json`);
    this.gatePath = path.join(this.stateDir, `${this.workspaceId}_gate.json`);
    this.auditPath = path.join(globalDir, 'audit.log');

    this.config = {
      botToken: '',
      allowedChatId: '',
      targetDir: resolvedTarget,
      defaultAgent: 'build',
      defaultModel: '',
      favoriteModels: [
        'opencode/deepseek-v4.1-flash-free',
        'opencode/glm-5.3-flash-free',
        'opencode/beam-free',
        'opencode/minimax-m3.1-flash-free',
        'opencode/mimo-v2.6-flash-free',
      ],
      dailyLimit: 200,
      runTimeout: 30 * 60,
      language: 'en',
      channel: 'telegram',
      engine: 'opencode',
      denyPatterns: [],
      allowedPaths: [],
      workspaces: resolvedTarget.startsWith(os.tmpdir()) ? [] : [resolvedTarget],
      extra: {},
    };

    this.load();
  }

  public load(): void {
    // 1. Global config file
    if (fs.existsSync(this.globalConfigPath)) {
      try {
        const raw = fs.readFileSync(this.globalConfigPath, 'utf-8');
        const data = JSON.parse(raw);
        this.merge(data);
      } catch {}
    }

    // 2. Project config file (.agentgram.json or legacy .rumuze-edit.json)
    const projectPath = fs.existsSync(this.projectConfigPath)
      ? this.projectConfigPath
      : this.legacyProjectConfigPath;

    if (fs.existsSync(projectPath)) {
      try {
        const raw = fs.readFileSync(projectPath, 'utf-8');
        const data = JSON.parse(raw);
        this.merge(data);
      } catch {}
    }

    // 3. Environment variables
    const envToken =
      process.env.AGENTGRAM_BOT_TOKEN ||
      process.env.RUMUZE_EDIT_BOT_TOKEN ||
      process.env.TGBRIDGE_TOKEN;
    if (envToken) this.config.botToken = envToken.trim();

    const envChat =
      process.env.AGENTGRAM_ALLOWED_CHAT_ID ||
      process.env.RUMUZE_EDIT_ALLOWED_CHAT_ID ||
      process.env.TGBRIDGE_ALLOWED_CHAT_ID;
    if (envChat) this.config.allowedChatId = envChat.trim();

    const envAgent =
      process.env.AGENTGRAM_AGENT ||
      process.env.RUMUZE_EDIT_AGENT ||
      process.env.TGBRIDGE_AGENT;
    if (envAgent) this.config.defaultAgent = envAgent.trim();

    const envModel =
      process.env.AGENTGRAM_MODEL ||
      process.env.RUMUZE_EDIT_MODEL ||
      process.env.TGBRIDGE_MODEL;
    if (envModel) this.config.defaultModel = envModel.trim();

    const envChannel = process.env.AGENTGRAM_CHANNEL;
    if (envChannel) this.config.channel = envChannel.trim();

    const envEngine = process.env.AGENTGRAM_ENGINE;
    if (envEngine) this.config.engine = envEngine.trim();
  }

  public merge(data: Record<string, unknown>): void {
    if (typeof data.bot_token === 'string') this.config.botToken = data.bot_token.trim();
    if (typeof data.botToken === 'string') this.config.botToken = data.botToken.trim();

    if (typeof data.allowed_chat_id === 'string' || typeof data.allowed_chat_id === 'number') {
      this.config.allowedChatId = String(data.allowed_chat_id).trim();
    }
    if (typeof data.allowedChatId === 'string' || typeof data.allowedChatId === 'number') {
      this.config.allowedChatId = String(data.allowedChatId).trim();
    }

    if (typeof data.default_agent === 'string') this.config.defaultAgent = data.default_agent.trim();
    if (typeof data.defaultAgent === 'string') this.config.defaultAgent = data.defaultAgent.trim();

    if (typeof data.default_model === 'string') this.config.defaultModel = data.default_model.trim();
    if (typeof data.defaultModel === 'string') this.config.defaultModel = data.defaultModel.trim();

    if (typeof data.channel === 'string') this.config.channel = data.channel.trim();
    if (typeof data.engine === 'string') this.config.engine = data.engine.trim();

    if (Array.isArray(data.favorite_models)) this.config.favoriteModels = data.favorite_models.map(String);
    if (Array.isArray(data.favoriteModels)) this.config.favoriteModels = data.favoriteModels.map(String);

    if (typeof data.daily_limit === 'number') this.config.dailyLimit = data.daily_limit;
    if (typeof data.dailyLimit === 'number') this.config.dailyLimit = data.dailyLimit;

    if (typeof data.run_timeout === 'number') this.config.runTimeout = data.run_timeout;
    if (typeof data.runTimeout === 'number') this.config.runTimeout = data.runTimeout;

    if (data.language === 'ar' || data.language === 'en') this.config.language = data.language;

    if (Array.isArray(data.deny_patterns)) this.config.denyPatterns = data.deny_patterns.map(String);
    if (Array.isArray(data.denyPatterns)) this.config.denyPatterns = data.denyPatterns.map(String);

    if (Array.isArray(data.allowed_paths)) this.config.allowedPaths = data.allowed_paths.map(String);
    if (Array.isArray(data.allowedPaths)) this.config.allowedPaths = data.allowedPaths.map(String);
    if (Array.isArray(data.workspaces)) {
      this.config.workspaces = [];
      for (const w of data.workspaces) {
        const resolved = path.resolve(String(w));
        if (fs.existsSync(resolved) && !resolved.startsWith(os.tmpdir()) && !this.config.workspaces.includes(resolved)) {
          this.config.workspaces.push(resolved);
        }
      }
    }
    if (
      fs.existsSync(this.config.targetDir) &&
      !this.config.targetDir.startsWith(os.tmpdir()) &&
      !this.config.workspaces.includes(this.config.targetDir)
    ) {
      this.config.workspaces.unshift(this.config.targetDir);
    }
  }

  public saveGlobal(): void {
    ensureConfigDirs();
    const payload = {
      bot_token: this.config.botToken,
      allowed_chat_id: this.config.allowedChatId,
      channel: this.config.channel || 'telegram',
      engine: this.config.engine || 'opencode',
      default_agent: this.config.defaultAgent,
      default_model: this.config.defaultModel,
      favorite_models: this.config.favoriteModels,
      daily_limit: this.config.dailyLimit,
      run_timeout: this.config.runTimeout,
      language: this.config.language,
      deny_patterns: this.config.denyPatterns,
      allowed_paths: this.config.allowedPaths,
      workspaces: this.config.workspaces,
      extra: this.config.extra,
    };

    fs.writeFileSync(this.globalConfigPath, JSON.stringify(payload, null, 2), {
      encoding: 'utf-8',
      mode: 0o600,
    });
  }

  public saveProject(): void {
    const payload = {
      bot_token: this.config.botToken,
      allowed_chat_id: this.config.allowedChatId,
      channel: this.config.channel || 'telegram',
      engine: this.config.engine || 'opencode',
      default_agent: this.config.defaultAgent,
      default_model: this.config.defaultModel,
      favorite_models: this.config.favoriteModels,
      language: this.config.language,
      deny_patterns: this.config.denyPatterns,
      allowed_paths: this.config.allowedPaths,
      extra: this.config.extra,
    };

    fs.writeFileSync(this.projectConfigPath, JSON.stringify(payload, null, 2), {
      encoding: 'utf-8',
      mode: 0o600,
    });
  }

  public addWorkspace(newWorkspace: string): boolean {
    const resolved = path.resolve(newWorkspace);
    if (!fs.existsSync(resolved)) return false;
    if (!this.config.workspaces.includes(resolved)) {
      this.config.workspaces.push(resolved);
      this.saveGlobal();
    }
    return true;
  }

  public removeWorkspace(workspace: string): boolean {
    const resolved = path.resolve(workspace);
    const idx = this.config.workspaces.indexOf(resolved);
    if (idx !== -1) {
      this.config.workspaces.splice(idx, 1);
      this.saveGlobal();
      return true;
    }
    return false;
  }

  public validate(): string[] {
    const errors: string[] = [];
    const isTelegram = !this.config.channel || this.config.channel === 'telegram';
    if (isTelegram && !this.config.botToken) {
      errors.push('Telegram Bot Token is missing. Run `agentgram init` or set AGENTGRAM_BOT_TOKEN.');
    }
    if (isTelegram && !this.config.allowedChatId) {
      errors.push('Allowed Chat ID is missing. Run `agentgram init` to pair your Telegram chat.');
    }
    if (!fs.existsSync(this.config.targetDir)) {
      errors.push(`Target directory does not exist: ${this.config.targetDir}`);
    }
    return errors;
  }
}
