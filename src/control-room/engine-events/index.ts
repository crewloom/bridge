import type { AgentEngineEvent } from '../../engines/engine.interface.js';
import { onRunFinished, onSessionError } from './completion.js';
import { onPermissionAsked } from './permission.js';
import { onToolOutput, onToolStarted } from './tools.js';
import type { EventDeps, EventHandler, EventProps } from './types.js';

export type { EventDeps } from './types.js';
export { buildCompletionReport } from './completion-report.js';

/** Engines name the same event differently, so each handler is registered under every alias it answers to. */
const HANDLERS: ReadonlyMap<string, EventHandler> = new Map<string, EventHandler>([
  ['permission.ask', onPermissionAsked],
  ['permission_request', onPermissionAsked],
  ['permission.asked', onPermissionAsked],
  ['tool.output', onToolOutput],
  ['tool.execute', onToolStarted],
  ['tool_call', onToolStarted],
  ['step_finish', onRunFinished],
  ['run.finish', onRunFinished],
  ['session.idle', onRunFinished],
  ['session.error', onSessionError],
]);

/** Applies an engine event to the active run. Events with no active run, or of an unknown type, are ignored. */
export async function handleEngineEvent(deps: EventDeps, event: AgentEngineEvent): Promise<void> {
  const run = deps.session.activeRun;
  if (!run) return;
  const handler = HANDLERS.get(event.type);
  if (!handler) return;
  await handler(deps, event, (event.properties || {}) as EventProps, run);
}
