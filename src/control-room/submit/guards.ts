import { t } from '../../i18n/index.js';
import { escapeHtml } from '../../telegram/telegram-client.js';
import type { RoomContext } from '../context.js';
import { say } from '../reply.js';
import { busyNotice, INTERRUPT_WORDS, PROGRESS_WORDS, progressReply } from './busy.js';

export type SubmitDeps = Pick<
  RoomContext,
  'channel' | 'engine' | 'chatId' | 'session' | 'policy' | 'targetDir' | 'config' | 'missionCard' | 'actions'
>;

/**
 * A pre-submit check. Returns true when it blocked the prompt (and told the owner why),
 * which ends the pipeline.
 */
export type PromptGuard = (deps: SubmitDeps, prompt: string, replyTo?: string | number) => Promise<boolean>;

const numericId = (id?: string | number): number | undefined => (typeof id === 'number' ? id : undefined);

const refuseDestructiveCommands: PromptGuard = async (deps, prompt) => {
  const hits = deps.policy.checkCommand(prompt);
  if (hits.length === 0) return false;
  await say(deps, t('policy_denied', deps.session.currentLanguage, { hits: escapeHtml(hits.slice(0, 3).join(', ')) }));
  return true;
};

const refusePromptInjection: PromptGuard = async (deps, prompt) => {
  const detection = deps.policy.checkPrompt(prompt);
  if (!detection.blocked) return false;
  await say(
    deps,
    t('prompt_injection_blocked', deps.session.currentLanguage, {
      reason: escapeHtml(detection.reason),
      confidence: Math.round(detection.confidence * 100),
    })
  );
  return true;
};

/** While a run is active a new prompt is not queued: the owner may interrupt, ask for progress, or is told to wait. */
const deferWhileBusy: PromptGuard = async (deps, prompt, replyTo) => {
  const { session } = deps;
  const run = session.activeRun;
  if (!run?.busy) return false;

  const word = prompt.trim().toLowerCase();
  if (INTERRUPT_WORDS.has(word)) {
    await deps.actions.abortCurrentRun();
    return true;
  }
  const reply = PROGRESS_WORDS.has(word)
    ? progressReply(run, session.currentLanguage)
    : busyNotice(run, session.currentLanguage);
  await say(deps, reply.text, { replyToMessageId: numericId(replyTo), replyMarkup: reply.keyboard });
  return true;
};

/** Checked in order; the first guard that blocks ends the pipeline. */
export const PROMPT_GUARDS: readonly PromptGuard[] = [refuseDestructiveCommands, refusePromptInjection, deferWhileBusy];
