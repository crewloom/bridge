import type { ChannelKeyboard, IChannelAdapter, IncomingChannelMessage } from '../channels/channel.interface.js';
import type { ConfigManager } from '../config/config-manager.js';
import type { InlineKeyboardMarkup } from '../domain/types.js';
import type { AgentEngineEvent, IAgentEngine } from '../engines/engine.interface.js';
import type { SecurityPolicy } from '../security/policy.js';
import type { MissionCard } from './mission-card.js';
import type { Language, RoomSession } from './session.js';
import type { SkillInfo } from './skills-catalog.js';

/** Use cases the control room offers to its handlers. Implemented by `ControlRoom`. */
export interface RoomActions {
  getMainKeyboard(): ChannelKeyboard & InlineKeyboardMarkup;
  getAllAvailableSkills(): SkillInfo[];
  handleUserMessage(msg: IncomingChannelMessage): Promise<void>;
  guardedSubmit(promptText: string, replyToMsgId?: string | number): Promise<void>;
  handleEngineEvent(event: AgentEngineEvent): Promise<void>;
  sendAgentsMenu(editMsgId?: string | number): Promise<void>;
  sendModelsMenu(page?: number, editMsgId?: string | number): Promise<void>;
  sendModeMenu(editMsgId?: string | number): Promise<void>;
  sendSessionsMenu(editMsgId?: string | number): Promise<void>;
  sendWorkspaceMenu(editMsgId?: string | number): Promise<void>;
  sendSkillsMenu(page?: number, editMsgId?: string | number): Promise<void>;
  sendMentionsHub(editMsgId?: string | number): Promise<void>;
  sendLanguageMenu(editMsgId?: string | number): Promise<void>;
  sendStatusReport(): Promise<void>;
  sendUsageReport(): Promise<void>;
  sendHandoffReport(): Promise<void>;
  sendDiff(): Promise<void>;
  switchWorkspace(newPath: string): Promise<void>;
  abortCurrentRun(): Promise<void>;
}

/**
 * Everything a handler may depend on. Handlers declare the subset they need with `Pick<RoomContext, ...>`,
 * so each one can be tested with a small fake instead of a whole `ControlRoom`.
 */
export interface RoomContext {
  readonly channel: IChannelAdapter;
  readonly engine: IAgentEngine;
  readonly chatId: string;
  readonly session: RoomSession;
  readonly policy: SecurityPolicy;
  readonly targetDir: string;
  readonly config: ConfigManager['config'];
  readonly missionCard: MissionCard;
  readonly actions: RoomActions;
}

/** Chooses between the Arabic and English variant of a string. */
export function pick<T>(language: Language, ar: T, en: T): T {
  return language === 'ar' ? ar : en;
}
