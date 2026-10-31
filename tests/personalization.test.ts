import test from 'node:test';
import assert from 'node:assert/strict';
import * as os from 'node:os';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  PersonalizationRepository,
  activatePersonaInScope,
  addPersonaDraft,
  setPersonalizationSettings,
} from '@crewloom/contracts';
import { createFsStorage, PersonalizationService } from '../src/personalization/index.js';
import { buildFinalPrompt } from '../src/control-room/submit/index.js';

const persona = (over = {}) => ({
  id: 'p',
  name: 'Direct me',
  version: 1,
  scope: { kind: 'personal' },
  language: 'en',
  tone: 'direct',
  responsePreferences: { length: 'short' },
  decisionPrinciples: ['quality first'],
  explicitConstraints: ['no emojis'],
  status: 'draft',
  ...over,
});

const skill = (over = {}) => ({
  id: 's1',
  name: 'PR review',
  description: 'Use when reviewing a diff',
  version: 1,
  activationRules: { when: ['a diff is shared'], unless: [] },
  inputs: [],
  outputs: [],
  instructions: 'Review the diff.',
  references: [],
  requiredCapabilities: [],
  validationState: 'unvalidated',
  status: 'draft',
  ...over,
});

test('buildFinalPrompt injects the active persona and skills before the message and drops empty sections', () => {
  const activePersona = persona({ status: 'active' });
  const withAll = buildFinalPrompt('Refactor this', { skill: 'frontend', persona: activePersona, skills: [skill({ status: 'active' })] });
  assert.match(withAll, /^\[Active Skill: frontend\]\n\n/);
  assert.match(withAll, /Name: Direct me \(v1\)/);
  assert.match(withAll, /### PR review \(v1\)/);
  assert.match(withAll, /Refactor this$/);

  const bare = buildFinalPrompt('Just a prompt', { skill: null, persona: null, skills: [] });
  assert.equal(bare, 'Just a prompt');

  const personaOnly = buildFinalPrompt('P', { skill: null, persona: activePersona, skills: [] });
  assert.match(personaOnly, /^## User persona/);
  assert.doesNotMatch(personaOnly, /\[Active Skill/);
});

test('PersonalizationService resolves and injects the active persona persisted in its state dir', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bridge-persona-'));

  // Seed a store the way the desktop app would: draft + activate, with personalization on.
  const seed = new PersonalizationRepository(createFsStorage(dir));
  const added = await seed.saveDraftChange((s) => addPersonaDraft(s, persona()));
  assert.equal(added.ok, true);
  const activated = await seed.commit((s) => activatePersonaInScope(setPersonalizationSettings(s, { enabled: true, learning: 'off' }), 'p', 1));
  assert.equal(activated.ok, true);

  const service = new PersonalizationService(dir);
  await service.load();
  assert.equal(service.listPersonas().length, 1);

  const personal = service.forNewTask();
  assert.equal(personal.persona?.name, 'Direct me');

  const finalPrompt = buildFinalPrompt('Deploy now', { skill: null, persona: personal.persona, skills: personal.skills });
  assert.match(finalPrompt, /Name: Direct me \(v1\)/);
  assert.match(finalPrompt, /- quality first/);
  assert.match(finalPrompt, /never grants tool access/);

  // Disabling the persona stops it from being injected.
  const disabled = await service.disable('p', 1);
  assert.equal(disabled.ok, true);
  assert.equal(service.forNewTask().persona, null);
});
