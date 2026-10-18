import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCallback,
  permissionKeyboard,
  decidePermission,
} from '../dist/index.js';

test('Permissions - parseCallback extracts action and permission id', () => {
  // Always Allow
  const [actAlways, idAlways] = parseCallback('pm:a:per_abc123456');
  assert.equal(actAlways, 'pm:a');
  assert.equal(idAlways, 'per_abc123456');

  // Allow Once
  const [actOnce, idOnce] = parseCallback('pm:o:per_abc123456');
  assert.equal(actOnce, 'pm:o');
  assert.equal(idOnce, 'per_abc123456');

  // Reject
  const [actReject, idReject] = parseCallback('pm:r:per_abc123456');
  assert.equal(actReject, 'pm:r');
  assert.equal(idReject, 'per_abc123456');

  // Mode toggle
  const [actMode, idMode] = parseCallback('mo:auto');
  assert.equal(actMode, 'mo:auto');
  assert.equal(idMode, null);
});

test('Permissions - permissionKeyboard layout has correct buttons and callback_data', () => {
  // English keyboard
  const kbEn = permissionKeyboard('per_test123', 'en');
  const rowsEn = kbEn.inline_keyboard;
  assert.equal(rowsEn.length, 3);
  assert.equal(rowsEn[0]?.[0]?.text, '✅ Allow Once');
  assert.equal(rowsEn[0]?.[0]?.callback_data, 'pm:o:per_test123');
  assert.equal(rowsEn[0]?.[1]?.text, '♾️ Always Allow');
  assert.equal(rowsEn[0]?.[1]?.callback_data, 'pm:a:per_test123');
  assert.equal(rowsEn[1]?.[0]?.text, '⛔ Reject');
  assert.equal(rowsEn[1]?.[1]?.text, '🛑 Stop Session');

  // Arabic keyboard
  const kbAr = permissionKeyboard('per_test123', 'ar');
  const rowsAr = kbAr.inline_keyboard;
  assert.equal(rowsAr[0]?.[0]?.text, '✅ مرة واحدة');
  assert.equal(rowsAr[0]?.[1]?.text, '♾️ سماح دائماً');
  assert.equal(rowsAr[1]?.[0]?.text, '⛔ رفض');
});

test('Permissions - decidePermission handles build and auto modes', () => {
  const safeProps = {
    permission: 'bash',
    metadata: { command: "rtk grep -rn 'Attendance' --include=*.php" },
    patterns: ['rtk grep*'],
  };

  // In build mode: returns "ask"
  const resBuild = decidePermission(safeProps, 'build');
  assert.equal(resBuild.decision, 'ask');

  // In auto mode: returns "allow"
  const resAuto = decidePermission(safeProps, 'auto');
  assert.equal(resAuto.decision, 'allow');
});

test('Permissions - decidePermission blocks destructive commands even in auto mode', () => {
  const dangerousProps = {
    permission: 'bash',
    metadata: { command: 'rm -rf /' },
    patterns: ['rm -rf /'],
  };

  // Destructive command MUST be rejected even in auto mode
  const resDangerous = decidePermission(dangerousProps, 'auto');
  assert.equal(resDangerous.decision, 'reject');
  assert.ok(resDangerous.reason?.includes('السياسة ترفض'));

  const formatProps = {
    permission: 'bash',
    metadata: { command: 'mkfs.ext4 /dev/nvme0n1' },
    patterns: ['mkfs*'],
  };
  const resFormat = decidePermission(formatProps, 'auto');
  assert.equal(resFormat.decision, 'reject');
});

test('Permissions - decidePermission permits ops scripts and SSH commands', () => {
  const opsProps = {
    permission: 'bash',
    metadata: { command: 'tools/ai/pinpoint_go.sh pinpoints' },
    patterns: ['tools/ai/pinpoint_go.sh*'],
  };

  // In build mode: asks user
  assert.equal(decidePermission(opsProps, 'build').decision, 'ask');

  // In auto mode: allows
  assert.equal(decidePermission(opsProps, 'auto').decision, 'allow');
});

test('Permissions - blocks write operations in read mode', () => {
  const writeProps = {
    permission: 'edit',
    metadata: { filepath: 'src/app.ts' },
  };
  assert.equal(decidePermission(writeProps, 'read').decision, 'reject');
});
