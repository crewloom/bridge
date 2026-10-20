import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ChannelRegistry,
  EngineRegistry,
  ConsoleChannelAdapter,
  ShellEngineAdapter,
  TelegramChannelAdapter,
  toTelegramMarkup,
  fromTelegramMarkup,
  type IChannelAdapter,
  type IAgentEngine,
  type AgentgramConfig,
} from '../dist/index.js';

test('ChannelRegistry - lists standard channels and supports custom registrations', () => {
  const list = ChannelRegistry.list();
  assert.ok(list.includes('telegram'));
  assert.ok(list.includes('console'));

  // Register custom mock channel
  let customCreated = false;
  ChannelRegistry.register('custom-mock', (_cfg: AgentgramConfig): IChannelAdapter => {
    customCreated = true;
    return new ConsoleChannelAdapter();
  });

  assert.ok(ChannelRegistry.has('custom-mock'));
  const adapter = ChannelRegistry.get('custom-mock', { botToken: '', allowedChatId: '', targetDir: '' } as any);
  assert.ok(adapter);
  assert.equal(customCreated, true);

  // Unknown channel throws
  assert.throws(() => {
    ChannelRegistry.get('non-existent-channel', {} as any);
  }, /Unknown channel adapter/);
});

test('EngineRegistry - lists standard engines and supports custom registrations', () => {
  const list = EngineRegistry.list();
  assert.ok(list.includes('opencode'));
  assert.ok(list.includes('shell'));
  assert.ok(list.includes('claude'));
  assert.ok(list.includes('aider'));

  // Register custom mock engine
  let engineCreated = false;
  EngineRegistry.register('custom-engine', (_cfg: AgentgramConfig): IAgentEngine => {
    engineCreated = true;
    return new ShellEngineAdapter({ cliCommand: 'sh' });
  });

  assert.ok(EngineRegistry.has('custom-engine'));
  const engine = EngineRegistry.get('custom-engine', { targetDir: process.cwd() } as any);
  assert.ok(engine);
  assert.equal(engineCreated, true);

  // Unknown engine throws
  assert.throws(() => {
    EngineRegistry.get('non-existent-engine', {} as any);
  }, /Unknown agent engine/);
});

test('TelegramChannelAdapter - converts ChannelKeyboard to Telegram inline markup accurately', () => {
  const markup = toTelegramMarkup({
    rows: [
      [
        { text: 'Allow', callbackData: 'pm:o:123' },
        { text: 'Reject', callbackData: 'pm:r:123' },
      ],
      [
        { text: 'Docs', url: 'https://rumuze.com' },
      ],
    ],
  });

  assert.ok(markup);
  assert.equal(markup.inline_keyboard.length, 2);
  assert.equal(markup.inline_keyboard[0]?.[0]?.text, 'Allow');
  assert.equal(markup.inline_keyboard[0]?.[0]?.callback_data, 'pm:o:123');
  assert.equal(markup.inline_keyboard[1]?.[0]?.url, 'https://rumuze.com');

  // Convert back
  const converted = fromTelegramMarkup(markup);
  assert.ok(converted);
  assert.equal(converted.rows.length, 2);
  assert.equal(converted.rows[0]?.[0]?.text, 'Allow');
  assert.equal(converted.rows[0]?.[0]?.callbackData, 'pm:o:123');
});

test('ConsoleChannelAdapter - sends and edits messages with formatted output', async () => {
  const adapter = new ConsoleChannelAdapter();
  assert.equal(adapter.id, 'console');
  assert.equal(adapter.name, 'Terminal Console');

  const sent = await adapter.sendMessage('test-chat', '<b>Hello</b> World &amp; AgentGram', {
    replyMarkup: {
      rows: [[{ text: 'Test Option', callbackData: 'opt:1' }]],
    },
  });

  assert.ok(sent.messageId);
  assert.equal(sent.chatId, 'test-chat');

  // Edit message
  await assert.doesNotReject(async () => {
    await adapter.editMessage('test-chat', sent.messageId, 'Updated Status');
  });

  // Answer action
  await assert.doesNotReject(async () => {
    await adapter.answerAction('action-1', 'Done');
  });
});

test('ShellEngineAdapter - executes command, captures events, and handles diff', async () => {
  const engine = new ShellEngineAdapter({
    workspaceDir: process.cwd(),
    cliCommand: 'sh',
  });

  assert.equal(engine.id, 'shell');
  assert.ok(engine.name.includes('sh'));

  const events: any[] = [];
  engine.on('event', (e) => events.push(e));

  const session = await engine.createSession({ title: 'Unit Test Task' });
  assert.ok(session.id);
  assert.equal(session.workspaceDir, process.cwd());

  // Execute safe echo command
  await engine.submitPrompt(session.id, 'echo "AgentGram Pluggable Engine OK"');

  assert.ok(events.length >= 2);
  assert.equal(events[0]?.type, 'tool.execute');
  assert.equal(events[events.length - 1]?.type, 'step_finish');
  assert.equal(events[events.length - 1]?.properties?.status, 'done');

  // Git diff capability
  const diff = await engine.getDiff();
  assert.equal(typeof diff, 'string');

  // Abort session
  await assert.doesNotReject(async () => {
    await engine.abortSession(session.id);
  });
});

test('OpenCodeAdapter - normalizes OpenCode SSE events into standard AgentEngineEvents', async () => {
  const { OpenCodeAdapter, OpenCodeClient } = await import('../dist/index.js');
  const dummyClient = new OpenCodeClient('http://127.0.0.1:9999');
  const adapter = new OpenCodeAdapter(dummyClient, process.cwd());

  assert.equal(adapter.id, 'opencode');
  assert.equal(adapter.name, 'OpenCode Agent');

  const capturedEvents: any[] = [];
  adapter.on('event', (e) => capturedEvents.push(e));

  // 1. permission.asked should normalize to permission.ask
  dummyClient.emit('event', {
    type: 'permission.asked',
    id: 'perm_123',
    permission: 'bash',
    patterns: ['ls -la'],
    metadata: { command: 'ls -la' },
  });

  const permEvent = capturedEvents.find((e) => e.type === 'permission.ask');
  assert.ok(permEvent, 'permission.ask must be emitted');
  assert.equal(permEvent.properties?.id, 'perm_123');
  assert.equal(permEvent.properties?.permission, 'bash');

  // 2. message.part.updated (tool running) should normalize to tool.execute
  dummyClient.emit('event', {
    type: 'message.part.updated',
    properties: {
      sessionID: 'ses_test',
      part: {
        type: 'tool',
        tool: 'bash',
        callID: 'call_99',
        state: { status: 'running', input: { command: 'echo 123' } },
      },
    },
  });

  const toolExec = capturedEvents.find((e) => e.type === 'tool.execute');
  assert.ok(toolExec, 'tool.execute must be emitted');
  assert.equal(toolExec.properties?.id, 'call_99');
  assert.equal(toolExec.properties?.title, 'echo 123');

  // 3. message.part.updated (text) + session.idle should normalize to step_finish
  dummyClient.emit('event', {
    type: 'message.part.updated',
    properties: {
      sessionID: 'ses_test',
      part: {
        type: 'text',
        text: 'Task complete successfully',
      },
    },
  });

  dummyClient.emit('event', {
    type: 'session.idle',
    properties: {
      sessionID: 'ses_test',
    },
  });

  const stepFinish = capturedEvents.find((e) => e.type === 'step_finish');
  assert.ok(stepFinish, 'step_finish must be emitted on session.idle');
  assert.equal(stepFinish.properties?.status, 'done');
  assert.equal(stepFinish.properties?.output, 'Task complete successfully');
});
