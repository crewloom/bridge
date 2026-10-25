import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { AgentEventServer, ConfigManager, ControlRoom, ShellEngineAdapter, SecurityPolicy, decidePermission,
  type ChannelUpdateHandler, type IncomingChannelAction } from '../dist/index.js';

async function until(condition: () => boolean) {
  for (let i = 0; i < 200; i++) { if (condition()) return; await new Promise((resolve) => setTimeout(resolve, 10)); }
  assert.fail('Timed out waiting for the observed operation');
}

test('control-room read mode refuses CLI writes and build waits for an actionable approval', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'crewloom-policy-'));
  process.env.AGENTGRAM_CONFIG_DIR = path.join(root, 'config');
  const configManager = new ConfigManager(root);
  configManager.config.allowedChatId = 'test';
  let handler: ChannelUpdateHandler;
  const channel = { id: 'mock', name: 'Mock', startListening: async (value: ChannelUpdateHandler) => { handler = value; },
    stopListening() {}, sendMessage: async () => ({ messageId: 1, chatId: 'test', timestamp: Date.now() }),
    editMessage: async () => {}, answerAction: async () => {} };
  const engine = new ShellEngineAdapter({ workspaceDir: root });
  const room = new ControlRoom({ channel, engine, configManager });
  const permissions: string[] = [];
  engine.on('event', (event) => { if (event.type === 'permission.ask') permissions.push(String(event.properties?.id)); });
  try {
    await room.start();
    room.currentMode = 'read';
    await room.guardedSubmit('printf denied > read.txt');
    await until(() => !Reflect.get(room, 'activeRun')?.busy);
    assert.equal(fs.existsSync(path.join(root, 'read.txt')), false);
    room.currentMode = 'build';
    await room.guardedSubmit('printf approved > build.txt');
    await until(() => permissions.length === 1);
    assert.equal(fs.existsSync(path.join(root, 'build.txt')), false);
    const action: IncomingChannelAction = { id: 'approve', senderId: 'test', chatId: 'test', actionData: `pm:o:${permissions[0]}` };
    await handler!.onAction(action);
    await until(() => fs.existsSync(path.join(root, 'build.txt')));
    await until(() => !Reflect.get(room, 'activeRun')?.busy);
    assert.equal(fs.readFileSync(path.join(root, 'build.txt'), 'utf8'), 'approved');
    await room.guardedSubmit('printf denied > changed-mode.txt');
    await until(() => permissions.length === 2);
    room.currentMode = 'read';
    await handler!.onAction({ ...action, actionData: `pm:a:${permissions[1]}` });
    await until(() => !Reflect.get(room, 'activeRun')?.busy);
    assert.equal(fs.existsSync(path.join(root, 'changed-mode.txt')), false);
  } finally { await room.stop(); fs.rmSync(root, { recursive: true, force: true }); }
});

test('stop terminates a running CLI descendant before reporting completion', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'crewloom-stop-'));
  const script = path.join(root, 'child.cjs');
  fs.writeFileSync(script, 'require("fs").writeFileSync("ready","yes");setTimeout(()=>require("fs").writeFileSync("late","bad"),1000)');
  const engine = new ShellEngineAdapter({ workspaceDir: root });
  const session = await engine.createSession();
  const running = engine.submitPrompt(session.id, `"${process.execPath}" "${script}" & wait`);
  try {
    await until(() => fs.existsSync(path.join(root, 'ready')));
    await engine.abortSession(session.id);
    await running;
    await new Promise((resolve) => setTimeout(resolve, 1100));
    assert.equal(fs.existsSync(path.join(root, 'late')), false);
  } finally { await engine.disconnect(); fs.rmSync(root, { recursive: true, force: true }); }
});

test('file permission decisions reject siblings, symlink parents and absolute escapes', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'crewloom-path-'));
  const project = path.join(root, 'project');
  const sibling = path.join(root, 'project-other');
  fs.mkdirSync(project); fs.mkdirSync(sibling); fs.symlinkSync(sibling, path.join(project, 'escape'));
  try {
    const policy = new SecurityPolicy(project);
    for (const target of [path.join(sibling, 'file'), path.join(project, 'escape/new/nested/file'), '/etc/crewloom-test']) {
      assert.equal(policy.checkFilePath(target).ok, false);
      assert.equal(decidePermission({ permission: 'write', metadata: { filepath: target } }, 'auto', policy).decision, 'reject');
    }
    assert.equal(decidePermission({ permission: 'write', metadata: { filepath: 'new/file' } }, 'auto', policy).decision, 'allow');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('loopback event ingress authenticates, bounds input and delivers the real event', async () => {
  const delivered: string[] = [];
  const server = new AgentEventServer(async (event) => { delivered.push(event.type); }, 'test-token');
  const endpoint = await server.start(0);
  const event = { eventId: 'evt-test', type: 'turn.finished', timestamp: Date.now(), agentId: 'crewloom-agent', payload: { message: 'finished' } };
  const post = (body: object, headers: Record<string, string> = {}) => fetch(`${endpoint}/api/events`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token', ...headers }, body: JSON.stringify(body),
  });
  try {
    assert.equal((await post(event, { Authorization: 'Bearer wrong' })).status, 401);
    assert.equal((await post(event, { Origin: 'https://foreign.example' })).status, 403);
    assert.equal((await post({ ...event, type: 'execute.command' })).status, 400);
    assert.equal((await post({ ...event, payload: { message: 'x'.repeat(65536) } })).status, 413);
    assert.equal((await post(event)).status, 202);
    assert.deepEqual(delivered, ['turn.finished']);
  } finally { await server.stop(); }
});
