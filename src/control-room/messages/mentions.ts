import * as fs from 'node:fs';
import * as path from 'node:path';
import type { IncomingChannelMessage } from '../../channels/channel.interface.js';
import { KNOWN_MODELS, resolveModelMetadata } from '../../domain/model-catalog.js';
import { escapeHtml } from '../../telegram/telegram-client.js';
import { sayWithMenu } from '../reply.js';
import type { MessageDeps, MessageHandler } from './types.js';

/** A `/command` or `@mention` split into its name, a normalized name and the text after it. */
interface Mention {
  raw: string;
  clean: string;
  rest: string;
}

type MentionResolver = (deps: MessageDeps, msg: IncomingChannelMessage, mention: Mention) => Promise<boolean>;

const isCommandText = (text: string): boolean => text.startsWith('@') || text.startsWith('/');

/** Text after a mention is either another command or a prompt for the engine. */
async function forward(deps: MessageDeps, msg: IncomingChannelMessage, rest: string): Promise<void> {
  if (isCommandText(rest)) await deps.actions.handleUserMessage({ ...msg, text: rest });
  else await deps.actions.guardedSubmit(rest, msg.id);
}

const AGENTS = ['build', 'plan', 'review', 'delegate', 'explorer', 'code_review', 'code-review'];

const resolveAgent: MentionResolver = async (deps, msg, { clean, rest }) => {
  if (!AGENTS.includes(clean) && clean !== 'agent') return false;

  let agent = clean;
  let task = rest;
  if (clean === 'agent') {
    const [name, ...words] = rest.split(/\s+/);
    agent = (name || 'build').toLowerCase().replace('-', '_');
    task = words.join(' ').trim();
  }
  if (agent === 'code_review') agent = 'code-review';
  deps.session.selectAgent(agent);

  if (task) await forward(deps, msg, task);
  else {
    await sayWithMenu(
      deps,
      `🤖 Active Agent switched to: <b>${escapeHtml(agent)}</b> ⚡\n<i>Send your instructions to execute with this agent.</i>`
    );
  }
  return true;
};

const MODEL_SHORTCUTS: Record<string, string> = {
  claude: 'claude-3-5-sonnet',
  sonnet: 'claude-3-5-sonnet',
  haiku: 'claude-3-5-haiku',
  opus: 'claude-3-opus',
  gemini: 'gemini-2.0-flash',
  gpt4o: 'gpt-4o',
  gpt_4o: 'gpt-4o',
  gpt: 'gpt-4o',
  o1: 'o1',
  o3: 'o3-mini',
  o3_mini: 'o3-mini',
  deepseek: 'deepseek-chat',
  deepseek_r1: 'deepseek-chat',
};

function findModel({ raw, clean }: Mention): string | null {
  const dashed = clean.replace(/_/g, '-');
  return MODEL_SHORTCUTS[clean] || (KNOWN_MODELS[raw] ? raw : KNOWN_MODELS[dashed] ? dashed : null);
}

const resolveModel: MentionResolver = async (deps, msg, mention) => {
  const model = findModel(mention);
  if (!model) return false;
  deps.session.selectModel(model);

  if (mention.rest) await forward(deps, msg, mention.rest);
  else {
    const meta = resolveModelMetadata(model);
    await sayWithMenu(
      deps,
      `🧠 Active Model switched to: <b>${escapeHtml(meta.name)}</b> (${escapeHtml(meta.provider)})\n` +
        `<code>سياق الذاكرة: ${escapeHtml(meta.contextWindow)} | ${escapeHtml(meta.tag)}</code>\n\n` +
        `<i>Send your prompt to execute with this model.</i>`
    );
  }
  return true;
};

/** Built-in operations tools: the shell command a mention expands to. */
const TOOL_COMMANDS: Record<string, (deps: MessageDeps, rest: string) => string> = {
  pinpoint_go: ({ targetDir }, rest) => {
    const script = path.join(targetDir, 'tools', 'ai', 'pinpoint_go.sh');
    const sub = rest || 'prod-status';
    return (fs.existsSync(script) ? `bash tools/ai/pinpoint_go.sh ${sub}` : `tools/ai/pinpoint_go.sh ${sub}`).trim();
  },
  query_perf: () => 'python3 tools/ai/query_perf_audit.py --all --summary',
  query_performance: () => 'python3 tools/ai/query_perf_audit.py --all --summary',
  verify_erp: () => 'python3 tools/ai/verify_erp_change.py --check-docs',
  erp_verify: () => 'python3 tools/ai/verify_erp_change.py --check-docs',
  validate_skills: () => 'python3 tools/ai/validate_skills.py',
  test_gates: () => 'python3 tools/ai/test_gates.py',
};

const resolveTool: MentionResolver = async (deps, msg, { clean, rest }) => {
  const build = TOOL_COMMANDS[clean];
  if (!build) return false;
  await deps.actions.guardedSubmit(build(deps, rest), msg.id);
  return true;
};

const resolveSkill: MentionResolver = async (deps, msg, { raw, clean, rest }) => {
  const skill = deps.actions.getAllAvailableSkills().find((s) => {
    const key = s.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return s.name.toLowerCase() === raw || key === clean || clean.endsWith(key);
  });
  if (!skill) return false;
  deps.session.selectSkill(skill.name);

  if (rest) await forward(deps, msg, rest);
  else {
    const description = skill.description ? `\n<i>${escapeHtml(skill.description)}</i>` : '';
    await sayWithMenu(
      deps,
      `🧰 Skill <b>${escapeHtml(skill.name)}</b> is now ACTIVE! 🎯${description}\n\n<i>Send your instructions or coding task now to execute with this skill.</i>`
    );
  }
  return true;
};

/** Tried in order: the first resolver that recognizes the name wins. */
const RESOLVERS: MentionResolver[] = [resolveAgent, resolveModel, resolveTool, resolveSkill];

/** Resolves `/name` and `@name` to an agent, model, tool or skill. */
export const resolveMention: MessageHandler = async (deps, msg, text) => {
  if (!isCommandText(text)) return false;
  const [first = '', ...words] = text.slice(1).trim().split(/\s+/);
  const raw = first.toLowerCase();
  const mention: Mention = { raw, clean: raw.replace(/[-@]/g, '_'), rest: words.join(' ').trim() };
  for (const resolver of RESOLVERS) {
    if (await resolver(deps, msg, mention)) return true;
  }
  return false;
};
