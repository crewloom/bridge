import test from 'node:test';
import assert from 'node:assert/strict';
import { t } from '../dist/index.js';

test('i18n - English translations default and parameter interpolation', () => {
  assert.equal(t('btn_stop', 'en'), '⏹ Stop');
  assert.equal(t('btn_diff', 'en'), '📤 Diff');
  assert.equal(t('btn_status', 'en'), '📊 Status');

  const rendered = t('welcome', 'en', { target: '/Volumes/project' });
  assert.ok(rendered.includes('/Volumes/project'));
});

test('i18n - Arabic translations support', () => {
  assert.equal(t('btn_stop', 'ar'), '⏹ إيقاف');
  assert.equal(t('btn_diff', 'ar'), '📤 الفروقات');
  assert.equal(t('btn_status', 'ar'), '📊 الحالة');

  const arabicMsg = t('welcome', 'ar', { target: '/Volumes/project' });
  assert.ok(arabicMsg.includes('/Volumes/project'));
  assert.ok(arabicMsg.includes('AgentGram'));
});

test('i18n - fallback to English on unknown key or missing parameter', () => {
  assert.equal(t('btn_stop', 'en'), '⏹ Stop');
});
