import { escapeHtml } from '../../telegram/telegram-client.js';
import { pick } from '../context.js';
import { say } from '../reply.js';
import { createRun } from '../run-factory.js';
import { PROMPT_GUARDS, type SubmitDeps } from './guards.js';

export type { SubmitDeps, PromptGuard } from './guards.js';
export { PROMPT_GUARDS } from './guards.js';

/** Starts a run: opens (or continues) the engine session, posts the mission card, then hands the prompt over. */
async function startRun(deps: SubmitDeps, prompt: string, replyTo?: string | number): Promise<void> {
  const { session, engine, config } = deps;

  let sessionId = session.engineSessionId;
  if (!sessionId) {
    sessionId = (await engine.createSession({ workspaceDir: deps.targetDir })).id;
    session.attachEngineSession(sessionId);
  }

  session.beginRun(createRun({
    sessionId,
    prompt,
    agent: session.currentAgent,
    model: session.currentModel,
    mode: session.currentMode,
    initialActivity: pick(session.currentLanguage, 'جاري التحضير وبدء التنفيذ...', 'Initializing...'),
    userMsgId: typeof replyTo === 'number' ? replyTo : undefined,
  }));

  await deps.missionCard.post(replyTo);
  deps.missionCard.startRefreshing();

  const skill = session.consumeSkill();
  const finalPrompt = skill ? `[Active Skill: ${skill}]\n${prompt}` : prompt;

  // Not awaited: the room keeps listening while the engine waits on a permission or runs a command.
  void engine
    .submitPrompt(sessionId, deps.policy.sanitizePrompt(finalPrompt), session.currentAgent, session.currentModel, {
      mode: session.currentMode,
      timeoutMs: config.runTimeout * 1000,
    })
    .catch(async (error: Error) => {
      await deps.actions.handleEngineEvent({ type: 'session.error', properties: { error: { message: error.message } } });
    });
}

/** Submits a prompt to the agent engine unless a guard blocks it. */
export async function guardedSubmit(deps: SubmitDeps, prompt: string, replyTo?: string | number): Promise<void> {
  for (const guard of PROMPT_GUARDS) {
    if (await guard(deps, prompt, replyTo)) return;
  }
  try {
    await startRun(deps, prompt, replyTo);
  } catch (err) {
    await say(deps, `❌ Error: ${escapeHtml((err as Error).message)}`);
  }
}
