import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ConfigManager, EngineRegistry, ChannelRegistry, loadPlugins } from '../dist/index.js';
import type { AgentEngineEvent } from '../dist/index.js';

function fixture(t: { after(fn: () => void): void }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bridge-extensions-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return { dir, manager: new ConfigManager(dir, path.join(dir, 'global.json')) };
}

test('custom CLI profile executes literal prompt arguments without shell interpolation', async (t) => {
  const { manager } = fixture(t);
  manager.merge({
    cliEngines: {
      'test-cli': {
        command: process.execPath,
        args: ['-e', 'process.stdout.write(JSON.stringify(process.argv.slice(1)))', '--'],
        promptArgs: ['exec', '{prompt}', '--label={prompt}'],
      },
    },
  });
  const engine = EngineRegistry.get('TEST-CLI', manager.config);
  const prompt = 'مرحبا "quoted"; $(echo unexpected) `echo nope` $& $\' $`\nsecond line';
  let output = '';
  engine.on('event', (event: AgentEngineEvent) => {
    if (event.type === 'tool.output' && event.properties?.stream === 'stdout') {
      output += event.properties.chunk;
    }
  });
  const session = await engine.createSession();
  await engine.submitPrompt(session.id, prompt);
  assert.deepEqual(JSON.parse(output), ['exec', prompt, `--label=${prompt}`]);
});

test('extension configuration survives save/reload and merges per-engine settings', (t) => {
  const { dir, manager } = fixture(t);
  manager.merge({
    channel: 'console',
    cliEngines: { first: { command: 'first-cli', promptArgs: ['{prompt}'] } },
    extra: { first: true },
  });
  manager.merge({
    cliEngines: { second: { command: 'second-cli', promptArgs: ['run', '{prompt}'] } },
    plugins: ['./adapter.mjs'],
    extra: { second: true },
  });
  manager.saveProject();
  const loaded = new ConfigManager(dir, path.join(dir, 'global.json'));
  assert.equal(loaded.config.cliEngines?.first?.command, 'first-cli');
  assert.equal(loaded.config.cliEngines?.second?.command, 'second-cli');
  assert.deepEqual(loaded.config.plugins, ['./adapter.mjs']);
  assert.deepEqual(loaded.config.extra, { first: true, second: true });
  assert.deepEqual(loaded.validate(), []);
  loaded.saveGlobal();
  fs.unlinkSync(loaded.projectConfigPath);
  const globalReload = new ConfigManager(dir, path.join(dir, 'global.json'));
  assert.deepEqual(globalReload.config.cliEngines, loaded.config.cliEngines);
  assert.deepEqual(globalReload.config.plugins, loaded.config.plugins);
});

test('invalid CLI profiles fail explicitly, including when loaded from project JSON', (t) => {
  const { dir, manager } = fixture(t);
  for (const profile of [null, { command: '' }, { command: 'tool', promptArgs: ['run'] },
    { command: 'tool', args: 'not-an-array', promptArgs: ['{prompt}'] }]) {
    assert.throws(() => manager.merge({ cliEngines: { custom: profile } }));
  }
  assert.throws(() => manager.merge({ cliEngines: { opencode: { command: 'tool', promptArgs: ['{prompt}'] } } }));
  fs.writeFileSync(path.join(dir, '.agentgram.json'), JSON.stringify({
    channel: 'console', cliEngines: { custom: { command: 'tool', promptArgs: [] } },
  }));
  const loaded = new ConfigManager(dir, path.join(dir, 'global.json'));
  assert.ok(loaded.validate().some((error) => error.includes('Invalid project configuration')));
});

test('local ESM and CommonJS plugins register channels and engines before resolution', async (t) => {
  const { dir, manager } = fixture(t);
  fs.writeFileSync(path.join(dir, 'channel.mjs'), `
    export async function register({ channels, config }) {
      await Promise.resolve();
      channels.register('fixture-channel', cfg => channels.get('console', cfg));
      config.extra.pluginOrder = ['channel'];
    }
  `);
  fs.writeFileSync(path.join(dir, 'engine.cjs'), `
    exports.register = ({ engines, config }) => {
      engines.register('fixture-engine', cfg => engines.get('shell', cfg));
      config.extra.pluginOrder.push('engine');
    };
  `);
  manager.merge({ plugins: ['./channel.mjs', './engine.cjs'] });
  await loadPlugins(manager.config);
  assert.equal(ChannelRegistry.get('fixture-channel', manager.config).id, 'console');
  assert.equal(EngineRegistry.get('fixture-engine', manager.config).id, 'shell');
  assert.deepEqual(manager.config.extra.pluginOrder, ['channel', 'engine']);
});

test('broken or missing plugins fail before adapter resolution', async (t) => {
  const { dir, manager } = fixture(t);
  fs.writeFileSync(path.join(dir, 'invalid.mjs'), 'export const notAPlugin = true;');
  manager.merge({ plugins: ['./invalid.mjs'] });
  await assert.rejects(loadPlugins(manager.config), /must export register/);
  manager.merge({ plugins: ['./missing.cjs'] });
  await assert.rejects(loadPlugins(manager.config));
  manager.merge({ plugins: ['./invalid.ts'] });
  await assert.rejects(loadPlugins(manager.config), /local .js, .mjs, or .cjs/);
  assert.throws(() => manager.merge({ plugins: [42] }), /plugins must be an array/);
});

test('CLI starts a plugin channel with a configured engine and fails on a broken plugin', (t) => {
  const { dir, manager } = fixture(t);
  fs.writeFileSync(path.join(dir, 'cli-channel.mjs'), `
    export function register({ channels }) {
      channels.register('cli-fixture', cfg => {
        const channel = channels.get('console', cfg);
        channel.startListening = async () => process.stdout.write('EXTENSION_READY');
        return channel;
      });
    }
  `);
  manager.merge({
    channel: 'cli-fixture',
    engine: 'profile-cli',
    plugins: ['./cli-channel.mjs'],
    cliEngines: { 'profile-cli': { command: process.execPath, promptArgs: ['{prompt}'] } },
  });
  manager.saveProject();
  const args = [path.resolve('dist/index.js'), 'start', '--dir', dir,
    '--channel', 'cli-fixture', '--engine', 'profile-cli'];
  const options = { encoding: 'utf8' as const, timeout: 5000,
    env: { ...process.env, AGENTGRAM_CONFIG_DIR: path.join(dir, 'isolated-global') } };
  const started = spawnSync(process.execPath, args, options);
  assert.equal(started.status, 0, started.stderr || started.error?.message);
  assert.match(started.stdout, /EXTENSION_READY/);

  manager.merge({ plugins: ['./missing.mjs'] });
  manager.saveProject();
  const failed = spawnSync(process.execPath, args, options);
  assert.equal(failed.status, 1);
  assert.doesNotMatch(failed.stdout, /EXTENSION_READY/);
});
