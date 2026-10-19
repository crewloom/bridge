/**
 * High-Performance Resilient Telegram Bot Client
 * Pure Node.js with native HTTPS keep-alive connection pooling and zero external dependencies.
 */
import * as https from 'node:https';
import type {
  InlineKeyboardMarkup,
  TelegramMessage,
  TelegramUpdate,
} from '../domain/types.js';

export interface SendMessageOptions {
  replyMarkup?: InlineKeyboardMarkup | undefined;
  replyToMessageId?: number | undefined;
  disableWebPagePreview?: boolean | undefined;
}

export function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<\/?[a-zA-Z][^>]*>/g, '');
}

export class TelegramClient {
  private readonly token: string;
  private readonly agent: https.Agent;
  private readonly baseUri: string;

  constructor(token: string) {
    this.token = token.trim();
    this.baseUri = `https://api.telegram.org/bot${this.token}`;
    this.agent = new https.Agent({
      keepAlive: true,
      keepAliveMsecs: 10000,
      maxSockets: 10,
      timeout: 35000,
    });
  }

  public async callApi<T = unknown>(
    method: string,
    payload: Record<string, unknown> = {},
    retries = 3
  ): Promise<T> {
    const url = `${this.baseUri}/${method}`;
    const body = JSON.stringify(payload);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await this.postJson(url, body);
        if (response.ok) {
          return response.result as T;
        }

        // If Telegram returns 400 with entity parse error and message has HTML, caller can fallback
        const desc = response.description || 'Unknown Telegram API Error';
        throw new Error(`Telegram API Error (${response.error_code}): ${desc}`);
      } catch (err) {
        const isLastAttempt = attempt === retries;
        const msg = (err as Error).message || '';

        // If error is 400 (Client Bad Request), don't retry network loop
        if (msg.includes('(400)')) {
          throw err;
        }

        if (isLastAttempt) {
          throw err;
        }

        // Exponential backoff
        await new Promise((r) => setTimeout(r, attempt * 500));
      }
    }

    throw new Error(`Failed to call Telegram API method: ${method}`);
  }

  private postJson(urlStr: string, body: string): Promise<{ ok: boolean; result?: unknown; error_code?: number; description?: string }> {
    return new Promise((resolve, reject) => {
      const url = new URL(urlStr);
      const req = https.request(
        {
          hostname: url.hostname,
          path: url.pathname + url.search,
          method: 'POST',
          agent: this.agent,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
          timeout: 40000,
        },
        (res) => {
          let chunks = '';
          res.setEncoding('utf-8');
          res.on('data', (d) => (chunks += d));
          res.on('end', () => {
            try {
              const data = JSON.parse(chunks);
              resolve(data);
            } catch {
              reject(new Error(`Invalid JSON response: ${chunks.slice(0, 100)}`));
            }
          });
        }
      );

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Telegram request timed out'));
      });

      req.write(body);
      req.end();
    });
  }

  public async sendMessage(
    chatId: string | number,
    text: string,
    options: SendMessageOptions = {}
  ): Promise<TelegramMessage> {
    const payload: Record<string, unknown> = {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: options.disableWebPagePreview ?? true,
    };

    if (options.replyMarkup) payload.reply_markup = options.replyMarkup;
    if (options.replyToMessageId) payload.reply_to_message_id = options.replyToMessageId;

    try {
      return await this.callApi<TelegramMessage>('sendMessage', payload);
    } catch (err) {
      // 400 Entity parse fallback: retry as plain text if HTML was rejected
      if ((err as Error).message.includes('(400)')) {
        payload.text = stripHtml(text);
        delete payload.parse_mode;
        return await this.callApi<TelegramMessage>('sendMessage', payload);
      }
      throw err;
    }
  }

  public async editMessageText(
    chatId: string | number,
    messageId: number,
    text: string,
    options: SendMessageOptions = {}
  ): Promise<TelegramMessage | boolean> {
    const payload: Record<string, unknown> = {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: options.disableWebPagePreview ?? true,
    };

    if (options.replyMarkup) payload.reply_markup = options.replyMarkup;

    try {
      return await this.callApi<TelegramMessage>('editMessageText', payload);
    } catch (err) {
      const msg = (err as Error).message;
      // If message is not modified, ignore error
      if (msg.includes('message is not modified')) {
        return true;
      }
      // 400 Fallback
      if (msg.includes('(400)')) {
        payload.text = stripHtml(text);
        delete payload.parse_mode;
        return await this.callApi<TelegramMessage>('editMessageText', payload);
      }
      throw err;
    }
  }

  public async answerCallbackQuery(
    callbackQueryId: string,
    text?: string,
    showAlert = false
  ): Promise<boolean> {
    const payload: Record<string, unknown> = {
      callback_query_id: callbackQueryId,
      show_alert: showAlert,
    };
    if (text) payload.text = text;

    try {
      return await this.callApi<boolean>('answerCallbackQuery', payload);
    } catch {
      return false;
    }
  }

  public async getUpdates(offset = 0, timeout = 25): Promise<TelegramUpdate[]> {
    return await this.callApi<TelegramUpdate[]>('getUpdates', {
      offset,
      timeout,
      allowed_updates: ['message', 'callback_query', 'inline_query'],
    });
  }

  public async answerInlineQuery(
    inlineQueryId: string,
    results: unknown[],
    options?: { cacheTime?: number; isPersonal?: boolean }
  ): Promise<boolean> {
    const payload: Record<string, unknown> = {
      inline_query_id: inlineQueryId,
      results,
      cache_time: options?.cacheTime ?? 5,
      is_personal: options?.isPersonal ?? true,
    };
    try {
      return await this.callApi<boolean>('answerInlineQuery', payload);
    } catch {
      return false;
    }
  }

  public async getMe(): Promise<{ id: number; username?: string; first_name: string }> {
    return await this.callApi<{ id: number; username?: string; first_name: string }>('getMe');
  }

  public async setMyCommands(
    commands: Array<{ command: string; description: string }>
  ): Promise<boolean> {
    try {
      return await this.callApi<boolean>('setMyCommands', { commands });
    } catch {
      return false;
    }
  }

  public async sendChatAction(
    chatId: string | number,
    action: 'typing' | 'upload_document' | 'record_video' | 'choose_sticker' = 'typing'
  ): Promise<boolean> {
    try {
      return await this.callApi<boolean>('sendChatAction', {
        chat_id: chatId,
        action,
      });
    } catch {
      return false;
    }
  }
}
