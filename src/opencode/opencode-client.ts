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
            if ((res.statusCode || 0) >= 400) {
              return reject(new Error(`OpenCode HTTP ${res.statusCode}: ${chunks.slice(0, 200)}`));
            }
            try {
              const parsed = chunks ? JSON.parse(chunks) : {};
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

    const url = new URL(`${this.baseUrl}/global/events`);
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
                const event = JSON.parse(dataStr) as OpenCodeEvent;
                this.emit('event', event);
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
    return this.request('POST', `/session/${sessionId}/prompt`, {
      prompt,
      agent,
      model,
    });
  }

  public async replyPermission(permissionId: string, decision: 'allow' | 'reject'): Promise<unknown> {
    return this.request('POST', `/permission/${permissionId}/reply`, { decision });
  }

  public async replyQuestion(questionId: string, answers: string[]): Promise<unknown> {
    return this.request('POST', `/question/${questionId}/reply`, { answers });
  }

  public async abortSession(sessionId: string): Promise<unknown> {
    return this.request('POST', `/session/${sessionId}/abort`, {});
  }

  public async getDiff(): Promise<string> {
    const res = await this.request<{ diff?: string } | string>('GET', '/git/diff');
    if (typeof res === 'object' && res && 'diff' in res) {
      return (res.diff as string) || '';
    }
    return String(res || '');
  }

  public async listAgents(): Promise<Array<{ name: string; description?: string }>> {
    return this.request<Array<{ name: string; description?: string }>>('GET', '/agent');
  }

  public async listModels(): Promise<Array<{ id: string; name?: string }>> {
    return this.request<Array<{ id: string; name?: string }>>('GET', '/model');
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
      ['serve', '--port', String(actualPort), '--hostname', '127.0.0.1'],
      {
        cwd: targetDir,
        env: {
          ...process.env,
          OPENCODE_SERVER_PASSWORD: password,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    const client = new OpenCodeClient(`http://127.0.0.1:${actualPort}`, password, targetDir);

    // Wait until server is accepting connections (up to 15s)
    let ready = false;
    for (let i = 0; i < 30; i++) {
      try {
        await client.request('GET', '/global/health');
        ready = true;
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    if (!ready) {
      proc.kill();
      throw new Error(`OpenCode server failed to start on port ${actualPort}`);
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
