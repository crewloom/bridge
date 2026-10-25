import { escapeHtml } from '../../telegram/telegram-client.js';
import { pick } from '../context.js';
import { sayWithMenu } from '../reply.js';
import type { CallbackHandler, CallbackRouter } from './router.js';

const newConversation: CallbackHandler = async (deps, call) => {
  const previous = deps.session.activeRun;
  deps.session.resetConversation();
  if (previous?.sessionId) await deps.engine.abortSession(previous.sessionId).catch(() => {});
  await call.toast(pick(deps.session.currentLanguage, '✨ تم بدء جلسة جديدة', '✨ New session started'));
  await sayWithMenu(deps, '✨ <b>New Session Ready</b> — send your prompt to start fresh.');
};

const resumeConversation: CallbackHandler = async (deps, call) => {
  deps.session.resumeEngineSession(call.arg);
  await call.toast();
  await sayWithMenu(deps, `📂 Resumed session: <code>${escapeHtml(call.arg)}</code>`);
};

export function registerConversationRoutes(router: CallbackRouter): void {
  router.on('new', newConversation).onPrefix('se:', resumeConversation);
}
