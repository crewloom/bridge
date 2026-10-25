import { APP_MISSION_CONTROL_HEADER } from '../../constants.js';
import { t } from '../../i18n/index.js';
import { sayWithMenu } from '../reply.js';
import type { MessageDeps, MessageHandler } from './types.js';

type Command = (deps: MessageDeps) => Promise<void>;

/** Fixed commands. Every alias of a command is listed beside it, so a command is added in one place. */
const COMMANDS: Array<{ aliases: string[]; run: Command }> = [
  { aliases: ['@', '@hub', '@mentions', '/mentions'], run: (d) => d.actions.sendMentionsHub() },
  {
    aliases: ['/start', '/help', '@help'],
    run: async (d) => {
      await sayWithMenu(d, `${APP_MISSION_CONTROL_HEADER}\n${t('help_title', d.session.currentLanguage)}`);
    },
  },
  // '/status', 'status' and 'st' are answered earlier by the inquiry handler.
  { aliases: ['@status'], run: (d) => d.actions.sendStatusReport() },
  { aliases: ['/agents', '@agents'], run: (d) => d.actions.sendAgentsMenu() },
  { aliases: ['/models', '@models'], run: (d) => d.actions.sendModelsMenu() },
  { aliases: ['/mode', '@mode'], run: (d) => d.actions.sendModeMenu() },
  { aliases: ['/sessions', '@sessions'], run: (d) => d.actions.sendSessionsMenu() },
  {
    aliases: ['/new', '@new'],
    run: async (d) => {
      d.session.discardRun();
      await sayWithMenu(d, '✨ <b>New Session Ready</b> — send your prompt to start.');
    },
  },
  { aliases: ['/diff', '@diff'], run: (d) => d.actions.sendDiff() },
  { aliases: ['/skills', '@skills'], run: (d) => d.actions.sendSkillsMenu() },
  { aliases: ['/usage', '@usage'], run: (d) => d.actions.sendUsageReport() },
  { aliases: ['/handoff', '@handoff'], run: (d) => d.actions.sendHandoffReport() },
  { aliases: ['/stop', '@stop'], run: (d) => d.actions.abortCurrentRun() },
  {
    aliases: ['/lang'],
    run: async (d) => {
      const language = d.session.toggleLanguage();
      await sayWithMenu(d, t('lang_changed', language));
    },
  },
];

const BY_ALIAS = new Map<string, Command>(COMMANDS.flatMap((c) => c.aliases.map((a) => [a, c.run] as const)));

/** Runs a fixed command when the whole message is one of its aliases. */
export const runFixedCommand: MessageHandler = async (deps, _msg, text) => {
  const command = BY_ALIAS.get(text);
  if (!command) return false;
  await command(deps);
  return true;
};

/** `/cd <path>` switches the workspace. */
export const runChangeDirectory: MessageHandler = async (deps, _msg, text) => {
  if (text !== '/cd' && !text.startsWith('/cd ')) return false;
  await deps.actions.switchWorkspace(text.slice(3).trim());
  return true;
};
