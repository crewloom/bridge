import test from 'node:test';
import assert from 'node:assert/strict';
import * as os from 'node:os';
import * as path from 'node:path';
import { SecurityPolicy } from '../dist/index.js';

test('SecurityPolicy - blocks destructive rm commands', () => {
  const tmp = os.tmpdir();
  const policy = new SecurityPolicy(tmp);

  const hits1 = policy.checkCommand('rm -rf /');
  assert.ok(hits1.length > 0, 'rm -rf / must be blocked');

  const hits2 = policy.checkCommand('rm -fr ~');
  assert.ok(hits2.length > 0, 'rm -fr ~ must be blocked');

  const hits3 = policy.checkCommand('rm -rf /*');
  assert.ok(hits3.length > 0, 'rm -rf /* must be blocked');
});

test('SecurityPolicy - blocks system destruction commands', () => {
  const tmp = os.tmpdir();
  const policy = new SecurityPolicy(tmp);

  const hitsFormat = policy.checkCommand('mkfs.ext4 /dev/sda1');
  assert.ok(hitsFormat.length > 0, 'mkfs must be blocked');

  const hitsShut = policy.checkCommand('shutdown -h now');
  assert.ok(hitsShut.length > 0, 'shutdown must be blocked');

  const hitsForce = policy.checkCommand('git push --force origin main');
  assert.ok(hitsForce.length > 0, 'git push --force must be blocked');
});

test('SecurityPolicy - permits operations, ops scripts, and SSH commands', () => {
  const tmp = os.tmpdir();
  const policy = new SecurityPolicy(tmp);

  const hitsSsh = policy.checkCommand('ssh -i ~/.ssh/id_rsa user@141.253.114.101');
  assert.equal(hitsSsh.length, 0, 'ssh commands must be allowed');

  const hitsPinpoint = policy.checkCommand('tools/ai/pinpoint_go.sh pinpoints');
  assert.equal(hitsPinpoint.length, 0, 'pinpoint_go ops script must be allowed');

  const hitsEnv = policy.checkCommand('cat .env.production');
  assert.equal(hitsEnv.length, 0, 'inspections must be allowed');

  const hitsSudo = policy.checkCommand('sudo systemctl status rveta');
  assert.equal(hitsSudo.length, 0, 'sudo service inspections must be allowed');
});

test('SecurityPolicy - allows safe developer commands', () => {
  const tmp = os.tmpdir();
  const policy = new SecurityPolicy(tmp);

  assert.equal(policy.checkCommand('git status').length, 0);
  assert.equal(policy.checkCommand('npm test').length, 0);
  assert.equal(policy.checkCommand('git diff').length, 0);
});

test('SecurityPolicy - supports custom deny patterns', () => {
  const tmp = os.tmpdir();
  const customPolicy = new SecurityPolicy(tmp, [String.raw`\bcustom_forbidden_tool\b`]);

  const hits = customPolicy.checkCommand('run custom_forbidden_tool --flag');
  assert.ok(hits.length > 0, 'custom pattern must trigger denial');
});

test('SecurityPolicy - verifies path safety with allowedPaths', () => {
  const tmp = os.tmpdir();
  const policy = new SecurityPolicy(tmp, [], ['/Volumes/data/remote-server']);

  const resSub = policy.checkFilePath(path.join(tmp, 'test.txt'));
  assert.ok(resSub.ok, 'paths inside workspace must be safe');

  const resAllowed = policy.checkFilePath('/Volumes/data/remote-server/keys.txt');
  assert.ok(resAllowed.ok, 'paths in allowedPaths must be safe');
});
