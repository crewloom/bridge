/**
 * AgentGram Pluggable Communication Channel Contract
 * Hexagonal architecture port for messaging and interaction channels (Telegram, Console, Slack, Discord, Webhook, etc.)
 * Pure Node.js with zero runtime dependencies.
 */

export interface ChannelButton {
  text: string;
  callbackData?: string | undefined;
  url?: string | undefined;
}

export interface ChannelKeyboard {
  rows: ChannelButton[][];
}

export interface ChannelSendOptions {
  replyMarkup?: ChannelKeyboard | undefined;
  replyToMessageId?: string | number | undefined;
  parseMode?: 'HTML' | 'Markdown' | 'None' | undefined;
  disableWebPagePreview?: boolean | undefined;
}

export interface ChannelMessageResult {
  messageId: string | number;
  chatId: string;
  timestamp: number;
}

export interface IncomingChannelMessage {
  id: string | number;
  senderId: string;
  chatId: string;
  text: string;
  timestamp: number;
  replyToMessageId?: string | number | undefined;
  raw?: unknown;
}

export interface IncomingChannelAction {
  id: string;
  senderId: string;
  chatId: string;
  actionData: string;
  messageId?: string | number | undefined;
  raw?: unknown;
}

export interface ChannelUpdateHandler {
  onMessage(msg: IncomingChannelMessage): Promise<void>;
  onAction(action: IncomingChannelAction): Promise<void>;
  onError?(err: Error): void;
}

export interface IChannelAdapter {
  readonly id: string;
  readonly name: string;

  /**
   * Start listening for incoming user messages and interactive actions.
   */
  startListening(handler: ChannelUpdateHandler): Promise<void>;

  /**
   * Stop listening / close active polling or connection.
   */
  stopListening(): Promise<void> | void;

  /**
   * Send a message to the target recipient/channel.
   */
  sendMessage(
    recipientId: string,
    text: string,
    options?: ChannelSendOptions
  ): Promise<ChannelMessageResult>;

  /**
   * Edit an existing message in-place.
   */
  editMessage(
    recipientId: string,
    messageId: string | number,
    text: string,
    options?: ChannelSendOptions
  ): Promise<void>;

  /**
   * Acknowledge or answer an interactive action / callback.
   */
  answerAction(actionId: string, text?: string): Promise<void>;

  /**
   * Optional: Send a typing or processing indicator.
   */
  sendChatAction?(recipientId: string, action?: string): Promise<void>;

  /**
   * Optional: Register slash commands for native autocomplete in channel client.
   */
  registerCommands?(commands: Array<{ command: string; description: string }>): Promise<void>;
}
