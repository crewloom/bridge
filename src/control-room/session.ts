import type { ConfigManager } from '../config/config-manager.js';
import type { ExecutionMode, OpenCodeRun } from '../domain/types.js';

export type Language = 'en' | 'ar';

export interface PermissionRequest {
  permission: string;
  metadata: Record<string, unknown>;
  patterns: string[];
}

/** Tracks permission prompts awaiting an answer and the requests the owner allowed for the whole session. */
export class PermissionLedger {
  private readonly pending = new Map<string, PermissionRequest>();
  private readonly alwaysAllowed = new Set<string>();

  /** Registers a prompt that is waiting for the owner's answer. */
  awaitAnswer(id: string, request: PermissionRequest): void {
    this.pending.set(id, request);
  }

  /** The pending request for `id`, or undefined once it was answered or expired. */
  peek(id: string): PermissionRequest | undefined {
    return this.pending.get(id);
  }

  /** Marks a pending request as answered. */
  resolve(id: string): void {
    this.pending.delete(id);
  }

  allowForSession(request: PermissionRequest): void {
    this.alwaysAllowed.add(JSON.stringify(request));
  }

  isAllowedForSession(request: PermissionRequest): boolean {
    return this.alwaysAllowed.has(JSON.stringify(request));
  }

  clearPending(): void {
    this.pending.clear();
  }
}

/**
 * The owner's conversation state: preferences, the active run and the engine session.
 * Preference changes that survive restarts are persisted here, so callers never write config themselves.
 */
export class RoomSession {
  readonly permissions = new PermissionLedger();

  private agent: string;
  private model: string;
  private language: Language;
  private mode: ExecutionMode = 'build';
  private skill: string | null = null;
  private run: OpenCodeRun | null = null;
  private engineSession: string | null = null;
  private lastRunSummary = { prompt: '', elapsedSeconds: 0, succeeded: true };
  private modelCatalog: string[] = [];
  private modelPage = 0;

  constructor(private readonly prefs: ConfigManager) {
    this.agent = prefs.config.defaultAgent;
    this.model = prefs.config.defaultModel;
    this.language = prefs.config.language;
  }

  get currentAgent(): string { return this.agent; }
  get currentModel(): string { return this.model; }
  get currentLanguage(): Language { return this.language; }
  get currentMode(): ExecutionMode { return this.mode; }
  get activeSkill(): string | null { return this.skill; }
  get activeRun(): OpenCodeRun | null { return this.run; }
  get isBusy(): boolean { return Boolean(this.run?.busy); }
  get engineSessionId(): string | null { return this.engineSession; }
  get lastPrompt(): string { return this.lastRunSummary.prompt; }
  get lastElapsedSeconds(): number { return this.lastRunSummary.elapsedSeconds; }
  get lastSucceeded(): boolean { return this.lastRunSummary.succeeded; }
  get knownModels(): readonly string[] { return this.modelCatalog; }
  get modelMenuPage(): number { return this.modelPage; }

  selectAgent(agent: string): void {
    this.agent = agent;
    this.prefs.config.defaultAgent = agent;
    this.prefs.saveGlobal();
  }

  selectModel(model: string): void {
    this.model = model;
    this.prefs.config.defaultModel = model;
    this.prefs.saveGlobal();
  }

  setLanguage(language: Language): void {
    this.language = language;
    this.prefs.config.language = language;
    this.prefs.saveGlobal();
  }

  toggleLanguage(): Language {
    this.setLanguage(this.language === 'en' ? 'ar' : 'en');
    return this.language;
  }

  setMode(mode: ExecutionMode): void { this.mode = mode; }

  selectSkill(skill: string | null): void { this.skill = skill; }

  /** Returns the armed skill and disarms it: a skill applies to one prompt only. */
  consumeSkill(): string | null {
    const skill = this.skill;
    this.skill = null;
    return skill;
  }

  rememberModelCatalog(models: string[]): void { this.modelCatalog = models; }

  showModelPage(page: number): void { this.modelPage = page; }

  attachEngineSession(id: string): void { this.engineSession = id; }

  resumeEngineSession(id: string): void { this.engineSession = id; }

  beginRun(run: OpenCodeRun): void {
    this.run = run;
    this.lastRunSummary = { ...this.lastRunSummary, prompt: run.prompt ?? this.lastRunSummary.prompt };
  }

  /** Drops the active run but keeps the engine session, so the next prompt continues it. */
  discardRun(): void { this.run = null; }

  /** Drops the active run and the engine session, so the next prompt starts a fresh conversation. */
  resetConversation(): void {
    this.run = null;
    this.engineSession = null;
  }

  /** Marks the active run as no longer executing, optionally recording why it stopped. */
  endRun(error?: string): void {
    if (!this.run) return;
    this.run.busy = false;
    this.run.done = true;
    if (error !== undefined) this.run.error = error;
  }

  recordExecution(elapsedSeconds: number, succeeded: boolean): void {
    this.lastRunSummary = {
      prompt: this.run?.prompt || this.lastRunSummary.prompt,
      elapsedSeconds,
      succeeded,
    };
  }
}
