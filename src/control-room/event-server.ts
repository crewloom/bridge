/** Bounded loopback telemetry ingress; event bodies are never interpreted as commands. */
import { createServer, type Server } from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';

const EVENT_TYPES = new Set(['agent.booted', 'agent.idle', 'turn.started', 'tool.invoking',
  'tool.completed', 'tool.failed', 'contract.violation', 'turn.finished']);

export interface TelemetryEvent {
  eventId: string;
  type: string;
  timestamp: number;
  agentId: string;
  payload: Record<string, unknown>;
}

export class AgentEventServer {
  private server: Server | undefined;
  constructor(private readonly receive: (event: TelemetryEvent) => Promise<void>, private readonly token = '') {}

  async start(port = 56079): Promise<string> {
    if (this.server) throw new Error('Agent event server already started.');
    if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid agent event port.');
    const server = createServer(async (req, res) => {
      const respond = (status: number, body: object) => {
        res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify(body));
      };
      const address = server.address();
      const actualPort = typeof address === 'object' && address ? address.port : port;
      const origins = [`http://127.0.0.1:${actualPort}`, `http://localhost:${actualPort}`];
      if (!origins.some((origin) => new URL(origin).host === req.headers.host) ||
          (req.headers.origin && !origins.includes(req.headers.origin))) {
        respond(403, { error: 'Untrusted event origin.' }); return;
      }
      if (this.token) {
        const digest = (value: string) => createHash('sha256').update(value).digest();
        if (!timingSafeEqual(digest(req.headers.authorization || ''), digest(`Bearer ${this.token}`))) {
          respond(401, { error: 'Event authentication required.' }); return;
        }
      }
      if (req.method === 'GET' && req.url === '/health') { respond(200, { service: 'Crewloom Bridge', ready: true }); return; }
      if (req.method !== 'POST' || req.url !== '/api/events') { respond(404, { error: 'Unknown event route.' }); return; }
      if (!req.headers['content-type']?.startsWith('application/json')) { respond(415, { error: 'Expected application/json.' }); return; }
      const chunks: Buffer[] = [];
      let bytes = 0;
      try {
        for await (const chunk of req) {
          bytes += Buffer.byteLength(chunk);
          if (bytes > 65536) { respond(413, { error: 'Event exceeds 64 KiB.' }); return; }
          chunks.push(Buffer.from(chunk));
        }
        const value: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid event');
        const event = value as Record<string, unknown>;
        if (typeof event.eventId !== 'string' || !event.eventId || event.eventId.length > 200 ||
            typeof event.type !== 'string' || !EVENT_TYPES.has(event.type) ||
            typeof event.agentId !== 'string' || !event.agentId || event.agentId.length > 200 ||
            typeof event.timestamp !== 'number' || !Number.isFinite(event.timestamp) ||
            !event.payload || typeof event.payload !== 'object' || Array.isArray(event.payload)) throw new Error('Invalid event');
        await this.receive({ eventId: event.eventId, type: event.type, timestamp: event.timestamp,
          agentId: event.agentId, payload: event.payload as Record<string, unknown> });
        respond(202, { accepted: true });
      } catch { respond(400, { error: 'Event was not accepted.' }); }
    });
    server.requestTimeout = 10000;
    server.headersTimeout = 10000;
    this.server = server;
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, '127.0.0.1', resolve);
    });
    const address = server.address();
    return `http://127.0.0.1:${typeof address === 'object' && address ? address.port : port}`;
  }

  async stop(): Promise<void> {
    const server = this.server;
    this.server = undefined;
    if (!server?.listening) return;
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
      server.closeAllConnections();
    });
  }
}
