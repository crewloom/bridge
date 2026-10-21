import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveModelMetadata, formatModelName } from '../src/domain/model-catalog.js';
import {
  buildModelsMenuView,
  buildSkillsMenuView,
  buildAgentsMenuView,
  buildModeMenuView,
  buildSessionsMenuView,
  buildLanguageMenuView,
  buildWorkspaceMenuView,
  buildMentionsHubView,
  renderMissionCard,
  renderBusyTaskCard,
  renderIdleStatusCard,
  renderPresenceWelcomeCard,
  renderSystemStatusReport,
  renderUsageReport,
  renderHandoffReport,
} from '../src/control-room/views/index.js';

test('resolveModelMetadata - accurately detects 1M, 2M, 200k, 128k context windows', () => {
  // MiniMax & LongCat (1M)
  const minimax = resolveModelMetadata('opencode/minimax-m3.1-flash-free');
  assert.equal(minimax.contextWindow, '1M');
  assert.equal(minimax.provider, 'MiniMax');

  const longcat = resolveModelMetadata('opencode/longcat-2.5-preview-free');
  assert.equal(longcat.contextWindow, '1M');
  assert.equal(longcat.provider, 'Meituan');

  // Google Gemini (2M for Pro, 1M for Flash)
  const geminiPro = resolveModelMetadata('google/gemini-1.5-pro');
  assert.equal(geminiPro.contextWindow, '2M');
  assert.equal(geminiPro.provider, 'Google');

  const geminiFlash = resolveModelMetadata('google/gemini-2.0-flash-exp');
  assert.equal(geminiFlash.contextWindow, '1M');
  assert.equal(geminiFlash.provider, 'Google');

  // Anthropic Claude (200k)
  const claude = resolveModelMetadata('anthropic/claude-3-5-sonnet');
  assert.equal(claude.contextWindow, '200k');
  assert.equal(claude.provider, 'Anthropic');

  // OpenAI (128k for GPT-4o, 200k for o3)
  const gpt4o = resolveModelMetadata('openai/gpt-4o');
  assert.equal(gpt4o.contextWindow, '128k');

  const o3mini = resolveModelMetadata('openai/o3-mini');
  assert.equal(o3mini.contextWindow, '200k');

  // Codestral (256k)
  const codestral = resolveModelMetadata('mistralai/codestral-2501');
  assert.equal(codestral.contextWindow, '256k');

  // Dynamic token parsing: e.g. "custom-model-64k" or "llm-2m"
  const custom64 = resolveModelMetadata('my-org/custom-model-64k-preview');
  assert.equal(custom64.contextWindow, '64k');

  const custom2m = resolveModelMetadata('vendor/experimental-2m');
  assert.equal(custom2m.contextWindow, '2M');
});

test('formatModelName - cleans prefixes, tags, and acronyms cleanly', () => {
  assert.equal(formatModelName('opencode/minimax-m3.1-flash-free'), 'MiniMax M3.1 Flash');
  assert.equal(formatModelName('deepseek/deepseek-chat:free'), 'DeepSeek Chat');
  assert.equal(formatModelName('google/gemini-2.0-flash-exp'), 'Gemini 2.0 Flash Exp');
});

test('View Builders - Modular views construct valid Telegram cards and keyboards', () => {
  // Models Menu View
  const modelsView = buildModelsMenuView({
    allModels: ['opencode/minimax-m3.1-flash-free', 'openai/gpt-4o'],
    favoriteModels: ['opencode/minimax-m3.1-flash-free'],
    currentModel: 'opencode/minimax-m3.1-flash-free',
    page: 0,
    language: 'ar',
  });
  assert.ok(modelsView.text.includes('1M'));
  assert.ok(modelsView.rows.length >= 2);

  // Skills Menu View
  const skillsView = buildSkillsMenuView({
    skills: [{ id: 'frontend', name: 'frontend', description: 'Vue 3 laws' }],
    activeSkill: 'frontend',
    page: 0,
    language: 'ar',
  });
  assert.ok(skillsView.text.includes('مهارات'));
  assert.ok(skillsView.rows.length >= 1);

  // Agents Menu View
  const agentsView = buildAgentsMenuView('build', 'en');
  assert.ok(agentsView.text.includes('build'));
  assert.ok(agentsView.rows.length >= 2);

  // Mode Menu View
  const modeView = buildModeMenuView('build', 'ar');
  assert.ok(modeView.text.includes('وضع التشغيل'));
  assert.equal(modeView.rows.length, 2);

  // Sessions Menu View
  const sessView = buildSessionsMenuView('sess-1234567890abcdef', 'en');
  assert.ok(sessView.text.includes('Active Sessions'));
  assert.equal(sessView.rows.length, 3);

  // Mentions Hub View
  const hubView = buildMentionsHubView('ar');
  assert.ok(hubView.text.includes('مركز المنشن'));
  assert.ok(hubView.rows.length >= 5);

  // Mission Card View
  const missionCard = renderMissionCard({
    run: {
      id: 'run-1',
      agent: 'build',
      model: 'opencode/minimax-m3.1-flash-free',
      mode: 'build',
      startedAt: Date.now() - 5000,
      busy: true,
      done: false,
      cmds: 2,
      files: new Set(['file1.ts']),
      prompt: 'Refactor views',
    },
    currentModel: 'opencode/minimax-m3.1-flash-free',
    engineName: 'OpenCode',
    channelName: 'Telegram',
    targetDir: '/Volumes/data/rumuze-edit',
  });
  assert.ok(missionCard.includes('1M'));
  assert.ok(missionCard.includes('MiniMax'));
  assert.ok(missionCard.includes('Refactor views'));
});
