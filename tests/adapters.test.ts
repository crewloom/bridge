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
