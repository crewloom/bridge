import { escapeHtml } from '../../telegram/telegram-client.js';
import { personaPromptSection, skillsPromptSection, type PersonaProfile, type UserSkill } from '@crewloom/contracts';
import { pick } from '../context.js';
import { say } from '../reply.js';
import { createRun } from '../run-factory.js';
import { PROMPT_GUARDS, type SubmitDeps } from './guards.js';

export type { SubmitDeps, PromptGuard } from './guards.js';
export { PROMPT_GUARDS } from './guards.js';

export interface PromptParts {
  /** The one-shot skill armed for this prompt, or null. */
  readonly skill: string | null;
  /** The active persona for a new task, or null. */
  readonly persona: PersonaProfile | null;
  /** The active user skills, rendered as one section. */
  readonly skills: readonly UserSkill[];
}

/**
 * Assembles the final prompt sent to the engine: the armed skill, then the active persona and user
 * skills, then the owner's message. Empty sections are dropped; the message is always last.
 */
export function buildFinalPrompt(prompt: string, parts: PromptParts): string {
  const sections: string[] = [];
  if (parts.skill) sections.push(`[Active Skill: ${parts.skill}]`);
  if (parts.persona) sections.push(personaPromptSection(parts.persona));
  if (parts.skills.length > 0) sections.push(skillsPromptSection(parts.skills));
  return sections.length > 0 ? `${sections.join('\n\n')}\n${prompt}` : prompt;
}

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

  const personal = deps.personalization.forNewTask();
  const finalPrompt = buildFinalPrompt(prompt, {
    skill: session.consumeSkill(),
    persona: personal.persona,
    skills: personal.skills,
  });

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
