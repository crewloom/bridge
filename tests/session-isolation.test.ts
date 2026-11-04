import test from 'node:test';
import assert from 'node:assert/strict';
import { OpenCodeAdapter } from '../src/engines/opencode.adapter.js';
import { OpenCodeClient } from '../src/opencode/opencode-client.js';
import type { AgentEngineEvent } from '../src/engines/engine.interface.js';

test('OpenCode isolates nested and top-level session events before normalization', async () => {
  const client = new OpenCodeClient('http://127.0.0.1:9999');
  client.submitPrompt = async () => undefined;
  const adapter = new OpenCodeAdapter(client);
  const events: AgentEngineEvent[] = [];
  adapter.on('event', (event: AgentEngineEvent) => events.push(event));
  await adapter.submitPrompt('session-A', 'hello');
  for (const event of [
    { type: 'message.part.updated', properties: { part: { sessionID: 'session-B', type: 'text', text: 'private B' } } },
    { type: 'message.part.delta', properties: { sessionID: 'session-B', field: 'text', delta: 'private B' } },
    { type: 'permission.asked', properties: { sessionID: 'session-B', id: 'per-B', permission: 'bash' } },
    { type: 'session.error', properties: { sessionID: 'session-B', error: { message: 'B failed' } } },
    { type: 'session.idle', properties: { sessionID: 'session-B' } },
  ]) client.emit('event', event);
  assert.deepEqual(events, []);
  client.emit('event', { type: 'message.part.updated', properties: { part: { sessionID: 'session-A', type: 'text', text: 'reply A' } } });
  client.emit('event', { type: 'session.idle', properties: { sessionID: 'session-A' } });
  const finish = events.find(event => event.type === 'step_finish');
  assert.equal(finish?.properties?.output, 'reply A');
  assert.equal(finish?.properties?.sessionID, 'session-A');
});
