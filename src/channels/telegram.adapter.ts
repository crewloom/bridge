/**
 * Telegram Channel Adapter for AgentGram
 * Production-ready default communication channel wrapping Telegram Bot API.
 * Pure Node.js with zero runtime dependencies.
 */
import { TelegramClient } from '../telegram/telegram-client.js';
import type {
  IChannelAdapter,
  ChannelSendOptions,
  ChannelMessageResult,
  ChannelKeyboard,
  ChannelUpdateHandler,
  IncomingChannelMessage,
  IncomingChannelAction,
  IncomingChannelInlineQuery,
} from './channel.interface.js';
import type { InlineKeyboardMarkup, TelegramUpdate } from '../domain/types.js';

export function toTelegramMarkup(keyboard?: ChannelKeyboard): InlineKeyboardMarkup | undefined {
  if (!keyboard) {
    return undefined;
  }
  if (!keyboard.rows || keyboard.rows.length === 0) {
    return { inline_keyboard: [] };
  }
  return {
    inline_keyboard: keyboard.rows.map((row) =>
      row.map((btn) => ({
        text: btn.text,
        callback_data: btn.callbackData ?? undefined,
        url: btn.url ?? undefined,
        switch_inline_query_current_chat: btn.switchInlineQueryCurrentChat ?? undefined,
      }))
    ),
  };
}

export function fromTelegramMarkup(markup?: InlineKeyboardMarkup): ChannelKeyboard | undefined {
  if (!markup || !markup.inline_keyboard || markup.inline_keyboard.length === 0) {
    return undefined;
  }
  return {
    rows: markup.inline_keyboard.map((row) =>
      row.map((btn) => ({
        text: btn.text,
        callbackData: btn.callback_data ?? undefined,
        url: btn.url ?? undefined,
        switchInlineQueryCurrentChat: btn.switch_inline_query_current_chat ?? undefined,
      }))
    ),
  };
}

export class TelegramChannelAdapter implements IChannelAdapter {
  public readonly id = 'telegram';
  public readonly name = 'Telegram Bot';
  public readonly client: TelegramClient;
  private isListening = false;
  private pollOffset = 0;

  constructor(clientOrToken: TelegramClient | string) {
    if (typeof clientOrToken === 'string') {
      this.client = new TelegramClient(clientOrToken);
    } else {
      this.client = clientOrToken;
    }
  }

  public async startListening(handler: ChannelUpdateHandler): Promise<void> {
    this.isListening = true;

    // Background polling loop
    (async () => {
      while (this.isListening) {
        try {
          const updates = await this.client.getUpdates(this.pollOffset, 25);
          for (const update of updates) {
            this.pollOffset = update.update_id + 1;
            await this.processUpdate(update, handler);
          }
        } catch (err) {
          if (handler.onError) {
            handler.onError(err as Error);
          }
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    })().catch((err) => {
      if (handler.onError) handler.onError(err as Error);
    });
  }

  public stopListening(): void {
    this.isListening = false;
  }

  private async processUpdate(update: TelegramUpdate, handler: ChannelUpdateHandler): Promise<void> {
    if (update.inline_query && handler.onInlineQuery) {
      const iq = update.inline_query;
      const inlineQuery: IncomingChannelInlineQuery = {
        id: iq.id,
        senderId: String(iq.from.id),
        query: iq.query,
        offset: iq.offset,
        chatType: iq.chat_type,
        raw: iq,
      };
      await handler.onInlineQuery(inlineQuery);
      return;
    }

    if (update.callback_query) {
      const cb = update.callback_query;
      const action: IncomingChannelAction = {
        id: cb.id,
        senderId: String(cb.from.id),
        chatId: cb.message ? String(cb.message.chat.id) : String(cb.from.id),
        actionData: cb.data || '',
        messageId: cb.message ? cb.message.message_id : undefined,
        raw: cb,
      };
      await handler.onAction(action);
      return;
    }

    if (update.message) {
      const msg = update.message;
      const channelMsg: IncomingChannelMessage = {
        id: msg.message_id,
        senderId: msg.from ? String(msg.from.id) : String(msg.chat.id),
        chatId: String(msg.chat.id),
        text: (msg.text || msg.caption || '').trim(),
        timestamp: msg.date * 1000,
        replyToMessageId: msg.reply_to_message ? msg.reply_to_message.message_id : undefined,
        raw: msg,
      };
      await handler.onMessage(channelMsg);
    }
  }

  public async sendMessage(
    recipientId: string,
    text: string,
    options?: ChannelSendOptions
  ): Promise<ChannelMessageResult> {
    const markup = toTelegramMarkup(options?.replyMarkup);
    const replyToId = typeof options?.replyToMessageId === 'number'
      ? options.replyToMessageId
      : options?.replyToMessageId
        ? parseInt(options.replyToMessageId, 10)
        : undefined;

    const res = await this.client.sendMessage(recipientId, text, {
      replyMarkup: markup,
      replyToMessageId: Number.isNaN(replyToId) ? undefined : replyToId,
      disableWebPagePreview: options?.disableWebPagePreview,
    });

    return {
      messageId: res.message_id,
      chatId: String(res.chat.id),
      timestamp: res.date * 1000,
    };
  }

  public async editMessage(
    recipientId: string,
    messageId: string | number,
    text: string,
    options?: ChannelSendOptions
  ): Promise<void> {
    const numericMsgId = typeof messageId === 'number' ? messageId : parseInt(messageId, 10);
    const markup = toTelegramMarkup(options?.replyMarkup);

    await this.client.editMessageText(recipientId, numericMsgId, text, {
      replyMarkup: markup,
    });
  }

  public async answerAction(actionId: string, text?: string): Promise<void> {
    await this.client.answerCallbackQuery(actionId, text);
  }

  public async sendChatAction(recipientId: string, action = 'typing'): Promise<void> {
    await this.client.sendChatAction(recipientId, action as any);
  }

  public async registerCommands(commands: Array<{ command: string; description: string }>): Promise<void> {
    await this.client.setMyCommands(commands);
  }

  public async answerInlineQuery(
    inlineQueryId: string,
    results: unknown[],
    options?: { cacheTime?: number; isPersonal?: boolean }
  ): Promise<boolean> {
    return await this.client.answerInlineQuery(inlineQueryId, results, options);
  }
}
