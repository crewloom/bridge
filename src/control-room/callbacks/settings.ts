import { escapeHtml } from '../../telegram/telegram-client.js';
import { resolveModelMetadata } from '../../domain/model-catalog.js';
import type { ExecutionMode } from '../../domain/types.js';
import { t } from '../../i18n/index.js';
import { pick } from '../context.js';
import { sayWithMenu } from '../reply.js';
import type { Language } from '../session.js';
import type { CallbackCall, CallbackDeps, CallbackHandler, CallbackRouter } from './router.js';

const MODES: readonly ExecutionMode[] = ['read', 'build', 'auto'];

/**
 * After a setting changed: redraw the menu the button lives in, or, when the button came from
 * somewhere without a menu to edit, confirm with a message instead.
 */
async function confirmChange(
  deps: CallbackDeps,
  call: CallbackCall,
  redraw: (messageId: string | number) => Promise<void>,
  fallbackText: string
): Promise<void> {
  if (call.messageId !== undefined) await redraw(call.messageId);
  else await sayWithMenu(deps, fallbackText);
}

const selectAgent: CallbackHandler = async (deps, call) => {
  const agent = call.arg;
  deps.session.selectAgent(agent);
  await call.toast(pick(deps.session.currentLanguage, `🧠 تم تفعيل: ${agent}`, `🧠 Activated: ${agent}`));
  await confirmChange(
    deps, call,
    (id) => deps.actions.sendAgentsMenu(id),
    `🧠 Agent changed to: <b>${escapeHtml(agent)}</b>`
  );
};

/** Resolves a model button: `md:raw:<id>` carries the id, `md:<n>` / `m:<n>` index the last shown list. */
function selectModel(resolve: (deps: CallbackDeps, arg: string) => string | undefined): CallbackHandler {
  return async (deps, call) => {
    const model = resolve(deps, call.arg);
    if (!model) {
      await call.toast();
      return;
    }
    deps.session.selectModel(model);
    const meta = resolveModelMetadata(model);
    await call.toast(pick(deps.session.currentLanguage, `🤖 تم تفعيل: ${meta.name}`, `🤖 Activated: ${meta.name}`));
    await confirmChange(
      deps, call,
      (id) => deps.actions.sendModelsMenu(deps.session.modelMenuPage, id),
      `🤖 Model changed to: <b>${escapeHtml(model)}</b>`
    );
  };
}

const modelById = (_deps: CallbackDeps, arg: string): string | undefined => arg || undefined;

const modelByIndex = (deps: CallbackDeps, arg: string): string | undefined => {
  const index = parseInt(arg, 10);
  return deps.session.knownModels[index] ?? (deps.config.favoriteModels || [])[index];
};

const selectMode: CallbackHandler = async (deps, call) => {
  const mode = call.arg as ExecutionMode;
  if (!MODES.includes(mode)) {
    await call.toast();
    return;
  }
  deps.session.setMode(mode);
  await call.toast(pick(deps.session.currentLanguage, `🔒 نمط التنفيذ: ${mode}`, `🔒 Mode: ${mode}`));
  await confirmChange(
    deps, call,
    (id) => deps.actions.sendModeMenu(id),
    `🔒 Mode changed to: <b>${mode}</b>`
  );
};

const selectSkill: CallbackHandler = async (deps, call) => {
  const skill = call.arg;
  deps.session.selectSkill(skill);
  await call.toast(pick(deps.session.currentLanguage, `🧰 تم تفعيل: ${skill}`, `🧰 Skill: ${skill}`));
  await confirmChange(
    deps, call,
    (id) => deps.actions.sendSkillsMenu(0, id),
    `🧰 Selected Skill: <b>${escapeHtml(skill)}</b> — send your task to execute with this skill.`
  );
};

const selectLanguage: CallbackHandler = async (deps, call) => {
  const language = call.arg as Language;
  if (language !== 'en' && language !== 'ar') {
    await call.toast();
    return;
  }
  deps.session.setLanguage(language);
  await call.toast(language === 'ar' ? '🇸🇦 تم ضبط اللغة: العربية' : '🇬🇧 Language: English');
  await confirmChange(
    deps, call,
    (id) => deps.actions.sendLanguageMenu(id),
    t('lang_changed', language)
  );
};

export function registerSettingsRoutes(router: CallbackRouter): void {
  router
    .onPrefix('ag:', selectAgent)
    .onPrefix('md:raw:', selectModel(modelById))
    .onPrefix('md:', selectModel(modelByIndex))
    .onPrefix('m:', selectModel(modelByIndex))
    .onPrefix('mo:', selectMode)
    .onPrefix('sk:', selectSkill)
    .onPrefix('lang:', selectLanguage);
}
