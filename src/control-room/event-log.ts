/** Append-only JSONL record of every accepted agent event; the raw material for later measurement. */
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import type { TelemetryEvent } from './event-server.js';

export class EventLog {
  constructor(private readonly dir: string, private readonly now: () => Date = () => new Date()) {}

  /** One file per UTC day. Throws on I/O failure; callers decide whether that is fatal. */
  async append(event: TelemetryEvent): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true, mode: 0o700 });
    const file = path.join(this.dir, `${this.now().toISOString().slice(0, 10)}.jsonl`);
    await fs.appendFile(file, `${JSON.stringify(event)}\n`, { encoding: 'utf8', mode: 0o600 });
  }
}

/**
 * Persist first, then forward. A failed write is reported through `onError` and never
 * blocks the forward path, so a full disk cannot silence the live control room.
 */
export function withEventLog(
  log: Pick<EventLog, 'append'>,
  forward: (event: TelemetryEvent) => Promise<void>,
  onError: (error: Error) => void,
): (event: TelemetryEvent) => Promise<void> {
  return async (event) => {
    try {
      await log.append(event);
    } catch (error) {
      onError(error instanceof Error ? error : new Error(String(error)));
    }
    await forward(event);
  };
}
