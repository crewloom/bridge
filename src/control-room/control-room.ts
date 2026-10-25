/**
 * Control room: owns the long-lived collaborators (channel, engine, policy, workspace) and wires them to the
 * handler modules. It is a facade: each use case lives in its own module and talks to the room through
 * `RoomContext`, so nothing outside this class reaches into its fields.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { TelegramClient, escapeHtml } from '../telegram/telegram-client.js';
import { OpenCodeClient } from '../opencode/opencode-client.js';
import { TelegramChannelAdapter } from '../channels/telegram.adapter.js';
import { OpenCodeAdapter } from '../engines/opencode.adapter.js';
import type {
  IChannelAdapter,
  ChannelKeyboard,
  IncomingChannelMessage,
  IncomingChannelAction,
  IncomingChannelInlineQuery,
} from '../channels/channel.interface.js';
import type { IAgentEngine, AgentEngineEvent } from '../engines/engine.interface.js';
import { SecurityPolicy } from '../security/policy.js';
import type { TelemetryEvent } from './event-server.js';
import { ConfigManager } from '../config/config-manager.js';
import { t } from '../i18n/index.js';
import { getStandardModelCatalog } from '../domain/model-catalog.js';
import {
  buildModelsMenuView,
  buildSkillsMenuView,
  buildAgentsMenuView,
  buildModeMenuView,
  buildSessionsMenuView,
  buildLanguageMenuView,
  buildWorkspaceMenuView,
  buildMentionsHubView,
  renderSystemStatusReport,
  renderUsageReport,
  renderHandoffReport,
} from './views/index.js';
import type { ExecutionMode, InlineKeyboardMarkup, OpenCodeRun } from '../domain/types.js';
import { createCallbackRouter } from './callbacks/index.js';
import { handleUserMessage as routeUserMessage } from './messages/index.js';
import { guardedSubmit as submitPrompt } from './submit/index.js';
import { handleEngineEvent as applyEngineEvent } from './engine-events/index.js';
import type { RoomActions, RoomContext } from './context.js';
import { MissionCard } from './mission-card.js';
import { RoomSession } from './session.js';
import { buildMainKeyboard } from './keyboards.js';
import { presentMenu } from './present-menu.js';
import { readGitSummary } from './git-summary.js';
import { getAvailableSkills, type SkillInfo } from './skills-catalog.js';
import { buildBotCommands } from './bot-commands.js';
import { buildInlineQueryResults } from './inline-query.js';

export { SYSTEM_HEADER, parseCallback, decidePermission, permissionKeyboard } from './permissions.js';

export interface ControlRoomOptions {
  channel: IChannelAdapter;
  engine: IAgentEngine;
  configManager: ConfigManager;
}

export class ControlRoom implements RoomActions {
  public readonly channel: IChannelAdapter;
  public engine: IAgentEngine;
  public readonly cfgManager: ConfigManager;
  public policy: SecurityPolicy;
  public readonly allowedChatId: string;
  public targetDir: string;
  public isListening = false;

  private readonly session: RoomSession;
  private readonly missionCard: MissionCard;
  private readonly callbackRouter = createCallbackRouter();
  private readonly context: RoomContext;

  // Polymorphic Constructor: supports either options object or legacy 3-arguments
  constructor(options: ControlRoomOptions);
  constructor(tg: TelegramClient, oc: OpenCodeClient, cfgManager: ConfigManager);
  constructor(
    arg1: ControlRoomOptions | TelegramClient,
    arg2?: OpenCodeClient,
    arg3?: ConfigManager
  ) {
    if ('channel' in arg1 && 'engine' in arg1) {
      this.channel = arg1.channel;
      this.engine = arg1.engine;
      this.cfgManager = arg1.configManager;
    } else {
      this.channel = new TelegramChannelAdapter(arg1 as TelegramClient);
      this.engine = new OpenCodeAdapter(arg2 as OpenCodeClient);
      this.cfgManager = arg3 as ConfigManager;
    }

    this.allowedChatId = this.cfgManager.config.allowedChatId;
    this.targetDir = this.cfgManager.config.targetDir;
    this.session = new RoomSession(this.cfgManager);
    this.policy = this.buildPolicy();

    // Live view of the room: engine, policy and workspace are replaced at runtime, so read them lazily.
    const room = this;
    const context = {
      get channel() { return room.channel; },
      get engine() { return room.engine; },
      get chatId() { return room.allowedChatId; },
      get session() { return room.session; },
      get policy() { return room.policy; },
      get targetDir() { return room.targetDir; },
      get config() { return room.cfgManager.config; },
      get missionCard() { return room.missionCard; },
      get actions(): RoomActions { return room; },
    } satisfies RoomContext;
    this.context = context;
    this.missionCard = new MissionCard(context);

    this.setupEngineEvents();
  }

  // --- Read-only views of the session, kept for callers that inspect the room ---
  public get currentMode(): ExecutionMode { return this.session.currentMode; }
  public set currentMode(mode: ExecutionMode) { this.session.setMode(mode); }
  public get currentAgent(): string { return this.session.currentAgent; }
  public get currentModel(): string { return this.session.currentModel; }
  public get language(): 'en' | 'ar' { return this.session.currentLanguage; }
  public get activeRun(): OpenCodeRun | null { return this.session.activeRun; }
  public get activeSkill(): string | null { return this.session.activeSkill; }

  // Backward compatibility getters
  public get tg(): TelegramClient {
    if (this.channel instanceof TelegramChannelAdapter) {
      return this.channel.client;
    }
    return new TelegramClient(this.cfgManager.config.botToken);
  }

  public get oc(): OpenCodeClient {
    if (this.engine instanceof OpenCodeAdapter) {
      return this.engine.client;
    }
    return new OpenCodeClient('http://127.0.0.1:4096', undefined, this.targetDir);
  }

  public set oc(client: OpenCodeClient) {
    if (this.engine instanceof OpenCodeAdapter) {
      this.engine.client = client;
    } else {
      this.engine = new OpenCodeAdapter(client, this.targetDir);
      this.setupEngineEvents();
    }
  }

  private buildPolicy(): SecurityPolicy {
    const { denyPatterns, allowedPaths } = this.cfgManager.config;
    return new SecurityPolicy(this.targetDir, denyPatterns, allowedPaths);
  }

  private setupEngineEvents(): void {
    this.engine.on('event', (event: AgentEngineEvent) => {
      this.handleEngineEvent(event).catch(console.error);
    });
  }

  /** Display lifecycle notifications without executing telemetry payloads or forwarding tool arguments. */
  public async receiveTelemetry(event: TelemetryEvent): Promise<void> {
    const labels: Record<string, [string, string]> = {
      'agent.booted': ['الوكيل متصل', 'Agent connected'],
      'turn.finished': ['اكتملت دورة الوكيل', 'Agent turn finished'],
      'tool.failed': ['فشلت أداة الوكيل', 'Agent tool failed'],
      'contract.violation': ['رفضت سياسة الوكيل العملية', 'Agent policy refused an operation'],
    };
    const label = labels[event.type];
    if (!label) return;
    const message = event.type === 'turn.finished' && typeof event.payload.message === 'string'
      ? `\n${escapeHtml(event.payload.message.slice(0, 2000))}` : '';
    await this.channel.sendMessage(this.allowedChatId,
      `🤖 <b>Crewloom Agent</b> · ${this.language === 'ar' ? label[0] : label[1]}${message}`);
  }

  public async start(): Promise<void> {
    try {
      await this.engine.connect();
    } catch (err) {
      console.warn('⚠️ Warning: Engine connection failed at startup:', (err as Error).message);
    }
    this.isListening = true;

    if (this.allowedChatId && this.allowedChatId.trim()) {
      try {
        await this.registerDefaultCommands();
      } catch {}

      try {
        await this.channel.sendMessage(
          this.allowedChatId,
          t('welcome', this.language, { target: escapeHtml(this.targetDir) }),
          { replyMarkup: this.getMainKeyboard() }
        );
      } catch (err) {
        console.warn('⚠️ Warning: Could not deliver initial welcome card:', (err as Error).message);
      }
    }

    await this.channel.startListening({
      onMessage: async (msg: IncomingChannelMessage) => {
        if (!this.isFromOwner(msg.chatId)) return;
        await this.handleUserMessage(msg);
      },
      onAction: async (action: IncomingChannelAction) => {
        if (!this.isFromOwner(action.senderId)) return;
        await this.handleCallback(action.id, action.actionData, action.messageId);
      },
      onInlineQuery: async (iq: IncomingChannelInlineQuery) => {
        if (!this.isFromOwner(iq.senderId)) return;
        await this.handleInlineQuery(iq);
      },
      onError: (err: Error) => {
        console.error('Channel error:', err.message);
      },
    });
  }

  /** Telegram is public, so only the configured chat may drive the room; other channels are already private. */
  private isFromOwner(senderOrChatId: string): boolean {
    return !(this.channel.id === 'telegram' && this.allowedChatId && senderOrChatId !== this.allowedChatId);
  }

  public async stop(): Promise<void> {
    this.isListening = false;
    this.channel.stopListening();
    this.missionCard.stopRefreshing();
    this.session.permissions.clearPending();
    await this.engine.disconnect();
  }

  // --- Handler entry points: each delegates to its module with this room's context ---
  public handleUserMessage(msg: IncomingChannelMessage): Promise<void> {
    return routeUserMessage(this.context, msg);
  }

  public guardedSubmit(promptText: string, replyToMsgId?: string | number): Promise<void> {
    return submitPrompt(this.context, promptText, replyToMsgId);
  }

  private handleCallback(cbId: string, data: string, messageId?: string | number): Promise<void> {
    return this.callbackRouter.dispatch(this.context, cbId, data, messageId);
  }

  public handleEngineEvent(event: AgentEngineEvent): Promise<void> {
    return applyEngineEvent(this.context, event);
  }

  public renderMissionCardText(): string {
    return this.missionCard.render();
  }

  public updateMissionCard(final = false): Promise<void> {
    return this.missionCard.update(final);
  }

  /** The complete interactive home keyboard with all 14 buttons. */
  public getMainKeyboard(): ChannelKeyboard & InlineKeyboardMarkup {
    return buildMainKeyboard(this.language);
  }

  public async sendAgentsMenu(editMsgId?: string | number): Promise<void> {
    await presentMenu(this.channel, this.allowedChatId, buildAgentsMenuView(this.currentAgent, this.language), editMsgId);
  }

  public async sendModelsMenu(page = 0, editMsgId?: string | number): Promise<void> {
    const favs = this.cfgManager.config.favoriteModels || [];
    let engineModels: string[] = [];
    if (typeof this.engine.listModels === 'function') {
      try {
        const raw = await this.engine.listModels();
        engineModels = (raw || []).map((m: { id: string }) => m.id);
      } catch {}
    }

    const allModels = Array.from(new Set<string>([...favs, ...engineModels, ...getStandardModelCatalog()]));
    this.session.rememberModelCatalog(allModels);

    const view = buildModelsMenuView({
      allModels,
      favoriteModels: favs,
      currentModel: this.currentModel,
      page,
      language: this.language,
    });
    await presentMenu(this.channel, this.allowedChatId, view, editMsgId);
  }

  public async sendModeMenu(editMsgId?: string | number): Promise<void> {
    await presentMenu(this.channel, this.allowedChatId, buildModeMenuView(this.currentMode, this.language), editMsgId);
  }

  public async sendSessionsMenu(editMsgId?: string | number): Promise<void> {
    await presentMenu(this.channel, this.allowedChatId, buildSessionsMenuView(this.activeRun?.sessionId, this.language), editMsgId);
  }

  public async sendStatusReport(): Promise<void> {
    const git = readGitSummary(this.targetDir);
    const run = this.activeRun;

    const text = renderSystemStatusReport({
      targetDir: this.targetDir,
      currentAgent: this.currentAgent,
      engineName: this.engine.name,
      currentModel: this.currentModel,
      currentMode: this.currentMode,
      channelName: this.channel.name,
      sessionId: run?.sessionId,
      isBusy: this.session.isBusy,
      branch: git.branch,
      dirtyCount: git.dirtyLines.length,
      activeRun: run && run.busy ? {
        startedAt: run.startedAt,
        prompt: run.prompt,
        cmds: run.cmds,
        filesCount: run.files.size,
      } : undefined,
      lastPrompt: this.session.lastPrompt,
      lastExecutionSuccess: this.session.lastSucceeded,
      lastExecutionElapsed: this.session.lastElapsedSeconds,
    });

    await this.channel.sendMessage(this.allowedChatId, text, {
      replyMarkup: this.getMainKeyboard(),
    });
  }

  public getAllAvailableSkills(): SkillInfo[] {
    return getAvailableSkills(this.targetDir);
  }

  public async registerDefaultCommands(): Promise<void> {
    if (!this.channel.registerCommands) return;
    const standardCommands = buildBotCommands(this.getAllAvailableSkills());

    try {
      await this.channel.registerCommands(standardCommands);
    } catch (err) {
      console.warn('Failed to register bot commands with channel:', (err as Error).message);
    }
  }

  public async sendSkillsMenu(page = 0, editMsgId?: string | number): Promise<void> {
    const view = buildSkillsMenuView({
      skills: this.getAllAvailableSkills(),
      activeSkill: this.activeSkill,
      page,
      language: this.language,
    });
    await presentMenu(this.channel, this.allowedChatId, view, editMsgId);
  }

  public async sendMentionsHub(editMsgId?: string | number): Promise<void> {
    await presentMenu(this.channel, this.allowedChatId, buildMentionsHubView(this.language), editMsgId);
  }

  public async handleInlineQuery(iq: IncomingChannelInlineQuery): Promise<void> {
    if (!this.channel.answerInlineQuery) return;

    const results = buildInlineQueryResults(
      iq.query || '',
      this.getAllAvailableSkills(),
      getStandardModelCatalog()
    );
    await this.channel.answerInlineQuery(iq.id, results, {
      cacheTime: 10,
      isPersonal: true,
    });
  }

  public async sendUsageReport(): Promise<void> {
    const cfg = this.cfgManager.config;
    const text = renderUsageReport({
      dailyLimit: cfg.dailyLimit,
      runTimeoutMinutes: Math.round(cfg.runTimeout / 60),
      workspaceId: this.cfgManager.workspaceId,
      platform: os.platform(),
      arch: os.arch(),
    });

    await this.channel.sendMessage(this.allowedChatId, text, {
      replyMarkup: this.getMainKeyboard(),
    });
  }

  public async sendLanguageMenu(editMsgId?: string | number): Promise<void> {
    await presentMenu(this.channel, this.allowedChatId, buildLanguageMenuView(this.language), editMsgId);
  }

  public async sendHandoffReport(): Promise<void> {
    const git = readGitSummary(this.targetDir, { commitCount: 5 });

    const text = renderHandoffReport({
      targetDir: this.targetDir,
      branch: git.branch,
      dirtyLines: git.dirtyLines,
      commits: git.commits,
      currentAgent: this.currentAgent,
      currentMode: this.currentMode,
    });

    await this.channel.sendMessage(this.allowedChatId, text, {
      replyMarkup: this.getMainKeyboard(),
    });
  }

  public async sendWorkspaceMenu(editMsgId?: string | number): Promise<void> {
    await presentMenu(this.channel, this.allowedChatId, buildWorkspaceMenuView(this.cfgManager.config.workspaces, this.targetDir, this.language), editMsgId);
  }

  public async switchWorkspace(newPath: string): Promise<void> {
    const resolved = path.resolve(newPath);
    if (!fs.existsSync(resolved)) {
      await this.channel.sendMessage(
        this.allowedChatId,
        t('ws_not_found', this.language, { path: escapeHtml(resolved) })
      );
      return;
    }

    if (this.session.isBusy) {
      await this.channel.sendMessage(
        this.allowedChatId,
        t('ws_busy', this.language, { ws: escapeHtml(this.targetDir) })
      );
      return;
    }

    this.targetDir = resolved;
    this.cfgManager.addWorkspace(resolved);
    this.policy = this.buildPolicy();

    // Switch workspace in the active agent engine
    await this.engine.setWorkspace(this.targetDir);

    await this.channel.sendMessage(
      this.allowedChatId,
      t('ws_changed', this.language, {
        name: escapeHtml(path.basename(resolved)),
        ws: escapeHtml(resolved),
        branch: 'main',
        dirty: '0',
      }),
      { replyMarkup: this.getMainKeyboard() }
    );
  }

  public async sendDiff(): Promise<void> {
    try {
      const diff = await this.engine.getDiff();
      if (!diff || !diff.trim()) {
        await this.channel.sendMessage(this.allowedChatId, '📄 <i>No local changes (working tree clean).</i>');
        return;
      }
      const preview = diff.length <= 3500 ? diff : diff.slice(0, 3500) + '\n… (truncated)';
      await this.channel.sendMessage(this.allowedChatId, `<pre><code>${escapeHtml(preview)}</code></pre>`);
    } catch (err) {
      await this.channel.sendMessage(this.allowedChatId, `❌ Diff error: ${(err as Error).message}`);
    }
  }

  public async abortCurrentRun(): Promise<void> {
    if (this.activeRun && this.activeRun.sessionId) {
      await this.engine.abortSession(this.activeRun.sessionId);
      this.session.endRun();
      await this.channel.sendMessage(this.allowedChatId, t('room_stopped', this.language));
      await this.updateMissionCard(true);
    }
  }
}
