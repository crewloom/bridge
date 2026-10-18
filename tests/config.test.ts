import test from 'node:test';
import assert from 'node:assert/strict';
import * as os from 'node:os';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ConfigManager, computeWorkspaceId } from '../dist/index.js';

test('ConfigManager - workspace ID is deterministic and safe', () => {
  const w1 = computeWorkspaceId('/path/to/my/project');
  const w2 = computeWorkspaceId('/path/to/my/project');
  assert.equal(w1, w2);
  assert.ok(/^[a-zA-Z0-9_\-]+_[a-f0-9]{12}$/.test(w1) || w1.includes('default'));
});

test('ConfigManager - configuration defaults are properly loaded', () => {
  const cfg = new ConfigManager(os.tmpdir());
  assert.equal(cfg.config.defaultAgent, 'build');
  assert.equal(cfg.config.language, 'en');
  assert.ok(cfg.config.dailyLimit >= 50);
  assert.ok(cfg.config.favoriteModels.includes('opencode/space-bunny-free'));
});

test('ConfigManager - validation catches missing bot token and chat ID', () => {
  const cfg = new ConfigManager(os.tmpdir());
  cfg.config.botToken = '';
  cfg.config.allowedChatId = '';
  const errors = cfg.validate();
  assert.ok(errors.length >= 2, 'Should return errors for token and chat ID');
});

test('ConfigManager - manages workspaces list cleanly', () => {
  const cfg = new ConfigManager(os.tmpdir());
  assert.ok(Array.isArray(cfg.config.workspaces));

  const tmpSub = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-ws-'));
  try {
    const added = cfg.addWorkspace(tmpSub);
    assert.ok(added);
    assert.ok(cfg.config.workspaces.includes(path.resolve(tmpSub)));
  } finally {
    try {
      cfg.removeWorkspace(tmpSub);
      fs.rmdirSync(tmpSub);
    } catch {}
  }
});
