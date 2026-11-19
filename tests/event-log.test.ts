import test from 'node:test';
import assert from 'node:assert/strict';
import * as os from 'node:os';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { EventLog, withEventLog } from '../src/control-room/event-log.js';
import type { TelemetryEvent } from '../src/control-room/event-server.js';

const event = (n: number): TelemetryEvent => ({ eventId: `e${n}`, type: 'tool.completed', timestamp: n, agentId: 'a',
  payload: { tool: 'probe', callId: `c${n}`, nested: false, outcome: 'completed' } });

test('EventLog appends one JSON line per event in a per-day file', async () => {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'evlog-')), 'events');
  const log = new EventLog(dir, () => new Date('2026-11-19T10:00:00Z'));
  await log.append(event(1)); await log.append(event(2));
  const lines = fs.readFileSync(path.join(dir, '2026-11-19.jsonl'), 'utf8').trim().split('\n');
  assert.deepEqual(lines.map(l => JSON.parse(l).eventId), ['e1', 'e2']);
});

test('withEventLog persists before forwarding, and a write failure is reported but does not block forwarding', async () => {
  const order: string[] = [];
  const ok = withEventLog({ append: async () => { order.push('log'); } }, async () => { order.push('fwd'); }, () => order.push('err'));
  await ok(event(1));
  assert.deepEqual(order, ['log', 'fwd']);
  const errors: string[] = [];
  const forwarded: string[] = [];
  const bad = withEventLog({ append: async () => { throw new Error('disk full'); } },
    async (e) => { forwarded.push(e.eventId); }, (e) => errors.push(e.message));
  await bad(event(2));
  assert.deepEqual(errors, ['disk full']);
  assert.deepEqual(forwarded, ['e2']);
});
