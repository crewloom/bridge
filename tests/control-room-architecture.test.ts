import test from 'node:test';
import assert from 'node:assert/strict';
import * as os from 'node:os';
import * as fs from 'node:fs';
import * as path from 'node:path';

process.env.AGENTGRAM_CONFIG_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-arch-cfg-'));

import { ConfigManager } from '../src/config/config-manager.js';
import { CallbackRouter, createCallbackRouter, type CallbackDeps } from '../src/control-room/callbacks/index.js';
import { RoomSession } from '../src/control-room/session.js';
import { classifyInquiry } from '../src/control-room/messages/index.js';
import { buildCompletionReport } from '../src/control-room/engine-events/index.js';
import { PROMPT_GUARDS, type SubmitDeps } from '../src/control-room/submit/index.js';
import { createRun } from '../src/control-room/run-factory.js';

function makeSession() {
  const cfg = new ConfigManager(process.cwd());
  let saved = 0;
  cfg.saveGlobal = () => { saved++; };
  return { cfg, session: new RoomSession(cfg), saves: () => saved };
}

function fakeDeps(session: RoomSession, cfg: ConfigManager) {
  const sent: string[] = [];
  const toasts: Array<string | undefined> = [];
  const calls: string[] = [];
  const deps = {
    channel: {
      answerAction: async (_id: string, text?: string) => { toasts.push(text); },
      sendMessage: async (_chat: string, text: string) => { sent.push(text); return { messageId: 1, chatId: 'c', timestamp: 0 }; },
      editMessage: async () => {},
    },
    engine: {
      replyPermission: async (id: string, d: string) => { calls.push(`reply:${id}:${d}`); },
      abortSession: async (id: string) => { calls.push(`abort:${id}`); },
    },
    chatId: 'c',
    session,
    policy: { checkCommand: () => [] as string[], checkPrompt: () => ({ blocked: false }) },
    targetDir: process.cwd(),
    config: cfg.config,
    actions: new Proxy({ getMainKeyboard: () => ({ rows: [] }) } as Record<string, unknown>, {
      get: (target, key: string) => target[key] ?? (async (...a: unknown[]) => { calls.push(`${key}(${a.join(',')})`); }),
    }),
  };
  return { deps: deps as unknown as CallbackDeps, sent, toasts, calls };
}

test('CallbackRouter prefers an exact key, then the longest prefix, and passes the remainder', async () => {
  const seen: string[] = [];
  const router = new CallbackRouter()
    .onPrefix('md:', async (_d, c) => { seen.push(`md:${c.arg}`); })
    .onPrefix('md:raw:', async (_d, c) => { seen.push(`raw:${c.arg}`); })
    .on('md:raw:fixed', async () => { seen.push('exact'); });
  const { cfg, session } = makeSession();
  const { deps } = fakeDeps(session, cfg);

  await router.dispatch(deps, 'a', 'md:3');
  await router.dispatch(deps, 'b', 'md:raw:gpt');
  await router.dispatch(deps, 'c', 'md:raw:fixed');
  assert.deepEqual(seen, ['md:3', 'raw:gpt', 'exact']);
});

test('CallbackRouter acknowledges unmatched data exactly once and never answers twice', async () => {
  const { cfg, session } = makeSession();
  const { deps, toasts } = fakeDeps(session, cfg);
  const router = new CallbackRouter().on('x', async (_d, c) => { await c.toast('first'); await c.toast('second'); });

  await router.dispatch(deps, '1', 'unknown');
  await router.dispatch(deps, '2', 'x');
  assert.deepEqual(toasts, [undefined, 'first']);
});

test('RoomSession persists preference changes and keeps a skill for one prompt only', () => {
  const { session, cfg, saves } = makeSession();
  session.selectModel('gpt-4o');
  session.selectAgent('plan');
  assert.equal(cfg.config.defaultModel, 'gpt-4o');
  assert.equal(cfg.config.defaultAgent, 'plan');
  assert.equal(saves(), 2);

  session.setMode('read');
  assert.equal(saves(), 2, 'execution mode is per session and is not persisted');

  session.selectSkill('frontend');
  assert.equal(session.consumeSkill(), 'frontend');
  assert.equal(session.consumeSkill(), null);
});

test('RoomSession separates discarding a run from resetting the conversation', () => {
  const { session } = makeSession();
  session.attachEngineSession('s1');
  session.beginRun(createRun({ sessionId: 's1', prompt: 'p', agent: 'a', model: 'm', mode: 'build', initialActivity: '' }));

  session.discardRun();
  assert.equal(session.activeRun, null);
  assert.equal(session.engineSessionId, 's1');

  session.resetConversation();
  assert.equal(session.engineSessionId, null);
});

test('permission buttons: expired requests are refused, allow-always is remembered for the session', async () => {
  const { session, cfg } = makeSession();
  const { deps, toasts, calls } = fakeDeps(session, cfg);
  const router = createCallbackRouter();

  await router.dispatch(deps, '1', 'pm:o:per_1');
  assert.match(String(toasts[0]), /expired|انتهت/);
  assert.deepEqual(calls, []);

  const request = { permission: 'bash', metadata: { command: 'ls' }, patterns: [] as string[] };
  session.beginRun(createRun({ sessionId: 's', prompt: 'p', agent: 'a', model: 'm', mode: 'auto', initialActivity: '' }));
  session.setMode('auto');
  session.permissions.awaitAnswer('per_2', request);
  await router.dispatch(deps, '2', 'pm:a:per_2');

  assert.ok(calls.includes('reply:per_2:allow'));
  assert.equal(session.permissions.peek('per_2'), undefined);
  assert.equal(session.permissions.isAllowedForSession(request), true);
});

test('stop button aborts the active run once', async () => {
  const { session, cfg } = makeSession();
  const { deps, calls } = fakeDeps(session, cfg);
  await createCallbackRouter().dispatch(deps, '1', 'stop');
  assert.ok(calls.includes('abortCurrentRun()'));
});

test('classifyInquiry separates presence pings, task status questions and real prompts', () => {
  assert.equal(classifyInquiry('Are you there?'), 'presence');
  assert.equal(classifyInquiry('ping'), 'presence');
  assert.equal(classifyInquiry('did it finish'), 'task-status');
  assert.equal(classifyInquiry('status'), 'task-status');
  assert.equal(classifyInquiry('Refactor the invoice service'), null);
});

test('buildCompletionReport covers failure, reply, terminal log and bare summary', () => {
  const run = createRun({ sessionId: 's', prompt: 'p', agent: 'a', model: 'm', mode: 'build', initialActivity: '' });
  run.cmds = 3;

  const failed = buildCompletionReport(run, { failed: true, error: 'boom', exitCode: 2 }, 5, 'en');
  assert.match(failed, /Execution Failed \(Exit: 2\)/);
  assert.match(failed, /<pre><code>boom<\/code><\/pre>/);

  const reply = buildCompletionReport(run, { failed: false, output: 'All good' }, 5, 'en');
  assert.match(reply, /Execution Finished<\/b>\nAll good$/);

  const log = buildCompletionReport(run, { failed: false, output: 'Deploying\nnpm run build' }, 5, 'en');
  assert.match(log, /<pre><code>Deploying/);

  const summary = buildCompletionReport(run, { failed: false }, 7, 'ar');
  assert.match(summary, /الأوامر المنفذة: ⚙️ 3/);
  assert.match(summary, /7 ثانية/);
});

test('prompt guards: destructive commands are refused, and a busy run can be interrupted by a plain word', async () => {
  const { cfg, session } = makeSession();
  const { deps, sent, calls } = fakeDeps(session, cfg);
  const submitDeps = deps as unknown as SubmitDeps;
  const [refuseCommands, , deferWhileBusy] = PROMPT_GUARDS;

  (submitDeps.policy as unknown as { checkCommand: () => string[] }).checkCommand = () => ['rm -rf /'];
  assert.equal(await refuseCommands!(submitDeps, 'rm -rf /'), true);
  assert.equal(sent.length, 1);

  assert.equal(await deferWhileBusy!(submitDeps, 'hello'), false, 'idle room accepts the prompt');

  session.beginRun(createRun({ sessionId: 's', prompt: 'p', agent: 'a', model: 'm', mode: 'build', initialActivity: '' }));
  assert.equal(await deferWhileBusy!(submitDeps, 'وقف'), true);
  assert.ok(calls.includes('abortCurrentRun()'));
});
