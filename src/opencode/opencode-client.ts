/**
 * OpenCode Engine Client & SSE Event Stream Consumer
 * Pure Node.js with native HTTP keep-alive, streaming SSE parser, and zero external dependencies.
 */
import * as http from 'node:http';
import * as net from 'node:net';
import * as crypto from 'node:crypto';
import * as child_process from 'node:child_process';
import { EventEmitter } from 'node:events';

export async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      srv.close((err) => (err ? reject(err) : resolve(port)));
    });
    srv.on('error', reject);
  });
}

export interface OpenCodeEvent {
  type: string;
  properties?: Record<string, unknown>;
  [key: string]: unknown;
}

export class OpenCodeClient extends EventEmitter {
  public readonly baseUrl: string;
  private readonly password?: string | undefined;
  public readonly directory: string;
  private serverProcess?: child_process.ChildProcess | undefined;
  private sseReq?: http.ClientRequest | undefined;
  private isConnected = false;

  constructor(baseUrl: string, password?: string, directory?: string) {
    super();
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.password = password;
    this.directory = directory || process.cwd();
  }

  public getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.password) {
      const basic = Buffer.from(`opencode:${this.password}`).toString('base64');
      headers['Authorization'] = `Basic ${basic}`;
    }
    return headers;
  }

  public async request<T = unknown>(
    method: string,
    endpoint: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = new URL(endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`);
    if (this.directory && !url.searchParams.has('directory')) {
      url.searchParams.set('directory', this.directory);
    }

    const payload = body ? JSON.stringify(body) : undefined;
    const headers = this.getHeaders();
    if (payload) {
      headers['Content-Length'] = String(Buffer.byteLength(payload));
    }

    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: url.hostname,
          port: url.port,
          path: url.pathname + url.search,
          method,
          headers,
          timeout: 45000,
        },
        (res) => {
          let chunks = '';
          res.setEncoding('utf-8');
          res.on('data', (d) => (chunks += d));
          res.on('end', () => {
            const contentType = (res.headers['content-type'] || '').toLowerCase();
            if (contentType.includes('text/html')) {
              return reject(
                new Error(
                  `OpenCode route not found (HTML response): ${method} ${url.pathname}. Verify endpoint path.`
                )
              );
            }
            if ((res.statusCode || 0) >= 400) {
              return reject(new Error(`OpenCode HTTP ${res.statusCode}: ${chunks.slice(0, 200)}`));
            }
            if (res.statusCode === 204 || !chunks.trim()) {
              return resolve(undefined as unknown as T);
            }
            try {
              const parsed = JSON.parse(chunks);
              resolve(parsed as T);
            } catch {
              resolve(chunks as unknown as T);
            }
          });
        }
      );

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('OpenCode request timed out'));
      });

      if (payload) req.write(payload);
      req.end();
    });
  }

  /**
   * Start consuming Server-Sent Events (SSE) from the OpenCode server.
   */
  public connectEventStream(): void {
    if (this.isConnected) return;

    const url = new URL(`${this.baseUrl}/global/event`);
    if (this.directory) {
      url.searchParams.set('directory', this.directory);
    }

    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        ...(this.password
          ? { Authorization: `Basic ${Buffer.from(`opencode:${this.password}`).toString('base64')}` }
          : {}),
      },
    });

    this.sseReq = req;

    req.on('response', (res) => {
      if ((res.statusCode || 0) >= 400) {
        this.emit('error', new Error(`SSE stream returned HTTP ${res.statusCode}`));
        return;
      }

      this.isConnected = true;
      this.emit('connected');

      let buffer = '';
      res.setEncoding('utf-8');

      res.on('data', (chunk) => {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.slice(5).trim();
            if (dataStr && dataStr !== '[DONE]') {
              try {
                const parsed = JSON.parse(dataStr);
                const event = (parsed.payload || parsed.event || parsed) as OpenCodeEvent;
                if (event && (event.type || event.id)) {
                  this.emit('event', event);
                }
              } catch {}
            }
          }
        }
      });

      res.on('end', () => {
        this.isConnected = false;
        this.emit('disconnected');
      });
    });

    req.on('error', (err) => {
      this.isConnected = false;
      this.emit('error', err);
    });

    req.end();
  }

  public disconnectEventStream(): void {
    if (this.sseReq) {
      this.sseReq.destroy();
      this.sseReq = undefined;
    }
    this.isConnected = false;
  }

  // API convenience methods
  public async submitPrompt(
    sessionId: string,
    prompt: string,
    agent?: string,
    model?: string
  ): Promise<unknown> {
    const body: Record<string, unknown> = {
      parts: [{ type: 'text', text: prompt }],
    };
    if (agent && agent.trim()) {
      body.agent = agent.trim();
    }
    if (model && model.trim()) {
      const trimmedModel = model.trim();
      if (trimmedModel.includes('/')) {
        const [providerID, ...rest] = trimmedModel.split('/');
        body.model = { providerID, modelID: rest.join('/') };
      } else {
        body.model = { providerID: 'opencode', modelID: trimmedModel };
      }
    }
    return this.request('POST', `/session/${sessionId}/prompt_async`, body);
  }

  public async replyPermission(permissionId: string, decision: 'allow' | 'reject'): Promise<unknown> {
    const reply = decision === 'allow' ? 'once' : 'reject';
    return this.request('POST', `/permission/${permissionId}/reply`, { reply });
  }

  public async replyQuestion(questionId: string, answers: string[]): Promise<unknown> {
    const formattedAnswers = answers.map((a) => (Array.isArray(a) ? a : [a]));
    return this.request('POST', `/question/${questionId}/reply`, { answers: formattedAnswers });
  }

  public async abortSession(sessionId: string): Promise<unknown> {
    return this.request('POST', `/session/${sessionId}/abort`);
  }

  public async getDiff(): Promise<string> {
    try {
      const res = await this.request<string | { diff?: string }>('GET', '/vcs/diff/raw');
      if (typeof res === 'string') return res;
      if (res && typeof res === 'object' && 'diff' in res) {
        return (res.diff as string) || '';
      }
    } catch {}
    return '';
  }

  public async listAgents(): Promise<Array<{ name: string; description?: string }>> {
    return this.request<Array<{ name: string; description?: string }>>('GET', '/agent');
  }

  public async listModels(): Promise<Array<{ id: string; name?: string }>> {
    try {
      const res = await this.request<{
        data?: Array<{ id: string; name?: string; providerID?: string }>;
      }>('GET', '/api/model');
      if (res && Array.isArray(res.data) && res.data.length > 0) {
        return res.data.map((m) => ({
          id: m.providerID && m.providerID !== 'opencode' ? `${m.providerID}/${m.id}` : m.id,
          name: m.name || m.id,
        }));
      }
    } catch {}

    try {
      const res = await this.request<{
        all?: Array<{ id: string; models?: Record<string, { id: string; name?: string }> }>;
      }>('GET', '/provider');
      if (res && Array.isArray(res.all)) {
        const list: Array<{ id: string; name?: string }> = [];
        for (const prov of res.all) {
          if (prov.models) {
            for (const m of Object.values(prov.models)) {
              list.push({
                id: prov.id !== 'opencode' ? `${prov.id}/${m.id}` : m.id,
                name: m.name || m.id,
              });
            }
          }
        }
        if (list.length > 0) return list;
      }
    } catch {}

    return [];
  }

  public async listSessions(): Promise<Array<{ id: string; title?: string }>> {
    return this.request<Array<{ id: string; title?: string }>>('GET', '/session');
  }

  public async createSession(title?: string): Promise<{ id: string; title?: string }> {
    return this.request<{ id: string; title?: string }>('POST', '/session', { title });
  }

  /**
   * Spawns an OpenCode server process locally on loopback.
   */
  public static async spawnServer(
    targetDir: string,
    port = 0
  ): Promise<{ client: OpenCodeClient; proc: child_process.ChildProcess; port: number }> {
    const password = crypto.randomBytes(16).toString('hex');
    const actualPort = port > 0 ? port : await getFreePort();

    const proc = child_process.spawn(
      'opencode',
      ['serve', '--port', String(actualPort), '--hostname', '127.0.0.1', '--pure'],
      {
        cwd: targetDir,
        env: {
          ...process.env,
          OPENCODE_SERVER_PASSWORD: password,
        },
        stdio: ['ignore', 'ignore', 'ignore'],
      }
    );

    const client = new OpenCodeClient(`http://127.0.0.1:${actualPort}`, password, targetDir);

    // Wait until server is accepting connections (up to 60s for low-memory VPS)
    let ready = false;
    for (let i = 0; i < 60; i++) {
      if (proc.exitCode !== null) {
        throw new Error(`OpenCode process exited early with code ${proc.exitCode}`);
      }
      try {
        await client.request('GET', '/global/health');
        ready = true;
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    if (!ready) {
      try {
        proc.kill('SIGTERM');
      } catch {}
      throw new Error(`OpenCode server failed to start on port ${actualPort} within 60s`);
    }

    client.serverProcess = proc;
    return { client, proc, port: actualPort };
  }

  public killServer(): void {
    if (this.serverProcess) {
      try {
        this.serverProcess.kill('SIGTERM');
      } catch {}
      this.serverProcess = undefined;
    }
  }
}
