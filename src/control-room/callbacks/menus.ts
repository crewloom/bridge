import { escapeHtml } from '../../telegram/telegram-client.js';
import { APP_COMMANDS_HEADER } from '../../constants.js';
import { t } from '../../i18n/index.js';
import { sayWithMenu } from '../reply.js';
import type { RoomActions } from '../context.js';
import type { CallbackDeps, CallbackHandler, CallbackRouter } from './router.js';

/** A button that acknowledges and then opens a menu, editing the pressed message in place. */
const openMenu = (open: (actions: RoomActions, messageId?: string | number) => Promise<void>): CallbackHandler =>
  async (deps, call) => {
    await call.toast();
    await open(deps.actions, call.messageId);
  };

/** A button that acknowledges and then runs a use case that takes no arguments. */
const run = (action: (actions: RoomActions) => Promise<void>): CallbackHandler =>
  async (deps, call) => {
    await call.toast();
    await action(deps.actions);
  };

const pageOf = (arg: string): number => parseInt(arg, 10) || 0;

/** Re-enters a mention shortcut (`@name`) as if the owner had typed it. */
const mention: CallbackHandler = async (deps, call) => {
  await call.toast();
  await deps.actions.handleUserMessage({
    id: Date.now(),
    senderId: deps.chatId,
    chatId: deps.chatId,
    text: `@${call.arg}`,
    timestamp: Date.now(),
  });
};

const home: CallbackHandler = async (deps, call) => {
  await call.toast();
  await sayWithMenu(deps, t('welcome', deps.session.currentLanguage, { target: escapeHtml(deps.targetDir) }));
};

const help: CallbackHandler = async (deps, call) => {
  await call.toast();
  await sayWithMenu(deps, `${APP_COMMANDS_HEADER}\n${t('help_title', deps.session.currentLanguage)}`);
};

const modelsHome: CallbackHandler = async (deps, call) => {
  deps.session.showModelPage(0);
  await call.toast();
  await deps.actions.sendModelsMenu(0, call.messageId);
};

const modelsPage: CallbackHandler = async (deps, call) => {
  const page = pageOf(call.arg);
  deps.session.showModelPage(page);
  await call.toast();
  await deps.actions.sendModelsMenu(page, call.messageId);
};

const skillsPage: CallbackHandler = async (deps, call) => {
  await call.toast();
  await deps.actions.sendSkillsMenu(pageOf(call.arg), call.messageId);
};

const switchWorkspace: CallbackHandler = async (deps: CallbackDeps, call) => {
  const target = deps.config.workspaces[parseInt(call.arg, 10)];
  await call.toast();
  if (target) await deps.actions.switchWorkspace(target);
};

export function registerMenuRoutes(router: CallbackRouter): void {
  router
    .on('menu:home', home)
    .on('home', home)
    .on('hp', help)
    .on('menu:ag', openMenu((a, id) => a.sendAgentsMenu(id)))
    .on('menu:mo', openMenu((a, id) => a.sendModeMenu(id)))
    .on('menu:se', openMenu((a, id) => a.sendSessionsMenu(id)))
    .on('menu:ws', openMenu((a, id) => a.sendWorkspaceMenu(id)))
    .on('menu:sk', openMenu((a, id) => a.sendSkillsMenu(0, id)))
    .on('menu:lg', openMenu((a, id) => a.sendLanguageMenu(id)))
    .on('menu:md', modelsHome)
    .onPrefix('pg:', modelsPage)
    .onPrefix('skpage:', skillsPage)
    .on('mention:hub', openMenu((a, id) => a.sendMentionsHub(id)))
    .on('mention:skills', openMenu((a, id) => a.sendSkillsMenu(0, id)))
    .on('mention:models', openMenu((a, id) => a.sendModelsMenu(0, id)))
    .on('mention:agents', openMenu((a, id) => a.sendAgentsMenu(id)))
    .onPrefix('mention:skill:', mention)
    .onPrefix('mention:model:', mention)
    .onPrefix('mention:agent:', mention)
    .on('st', run((a) => a.sendStatusReport()))
    .on('diff', run((a) => a.sendDiff()))
    .on('us', run((a) => a.sendUsageReport()))
    .on('ho', run((a) => a.sendHandoffReport()))
    .onPrefix('ws:', switchWorkspace);
}
