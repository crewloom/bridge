import type { OpenCodeRun } from '../../domain/types.js';
import type { AgentEngineEvent } from '../../engines/engine.interface.js';
import type { RoomContext } from '../context.js';

export type EventDeps = Pick<
  RoomContext,
  'channel' | 'engine' | 'chatId' | 'session' | 'policy' | 'missionCard' | 'actions'
>;

export type EventProps = Record<string, unknown>;

/** Handles one kind of engine event for the run that is currently active. */
export type EventHandler = (deps: EventDeps, event: AgentEngineEvent, props: EventProps, run: OpenCodeRun) => Promise<void>;
