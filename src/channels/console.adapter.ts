/**
 * Console Terminal Channel Adapter for AgentGram
 * Interactive terminal REPL channel for local ops, CLI usage, and offline testing.
 * Pure Node.js with zero runtime dependencies.
 */
import * as readline from 'node:readline';
import type {
  IChannelAdapter,
  ChannelSendOptions,
  ChannelMessageResult,
  ChannelKeyboard,
  ChannelUpdateHandler,
  IncomingChannelMessage,
  IncomingChannelAction,
} from './channel.interface.js';

export class ConsoleChannelAdapter implements IChannelAdapter {
  public readonly id = 'console';
  public readonly name = 'Terminal Console';
  private rl?: readline.Interface;
  private isListening = false;
  private messageCounter = 1;
  private activeKeyboard: Map<number, string> = new Map();

  constructor(
    private readonly input: NodeJS.ReadableStream = process.stdin,
    private readonly output: NodeJS.WritableStream = process.stdout
  ) {}

  public async startListening(handler: ChannelUpdateHandler): Promise<void> {
    this.isListening = true;
    this.rl = readline.createInterface({
      input: this.input,
      output: this.output,
      prompt: 'agentgram> ',
    });

    this.rl.prompt();

    this.rl.on('line', async (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) {
        if (this.isListening) this.rl?.prompt();
        return;
      }

      // Check if user entered an action index from current keyboard
      const num = parseInt(trimmed, 10);
      if (!Number.isNaN(num) && this.activeKeyboard.has(num)) {
        const actionData = this.activeKeyboard.get(num)!;
        const action: IncomingChannelAction = {
          id: `console-action-${Date.now()}`,
          senderId: 'console-user',
          chatId: 'console',
          actionData,
        };
        await handler.onAction(action);
        if (this.isListening) this.rl?.prompt();
        return;
      }

      // Regular message
      const msg: IncomingChannelMessage = {
        id: ++this.messageCounter,
        senderId: 'console-user',
        chatId: 'console',
        text: trimmed,
        timestamp: Date.now(),
      };

      await handler.onMessage(msg);
      if (this.isListening) this.rl?.prompt();
    });

    this.rl.on('close', () => {
      this.isListening = false;
    });
  }

  public stopListening(): void {
    this.isListening = false;
    if (this.rl) {
      this.rl.close();
      this.rl = undefined;
    }
  }

  public async sendMessage(
    recipientId: string,
    text: string,
    options?: ChannelSendOptions
  ): Promise<ChannelMessageResult> {
    const cleanText = text
      .replace(/<[^>]+>/g, '') // Strip HTML tags for clean terminal display
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');

    console.log(`\n\x1b[36m[AgentGram]\x1b[0m ${cleanText}`);

    this.renderKeyboard(options?.replyMarkup);

    const msgId = ++this.messageCounter;
    return {
      messageId: msgId,
      chatId: recipientId,
      timestamp: Date.now(),
    };
  }

  public async editMessage(
    recipientId: string,
    messageId: string | number,
    text: string,
    options?: ChannelSendOptions
  ): Promise<void> {
    const cleanText = text
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');

    console.log(`\n\x1b[33m[Update #${messageId}]\x1b[0m ${cleanText}`);
    this.renderKeyboard(options?.replyMarkup);
  }

  public async answerAction(_actionId: string, text?: string): Promise<void> {
    if (text) {
      console.log(`\x1b[32m✔ ${text}\x1b[0m`);
    }
  }

  private renderKeyboard(keyboard?: ChannelKeyboard): void {
    this.activeKeyboard.clear();
    if (!keyboard || !keyboard.rows || keyboard.rows.length === 0) return;

    let index = 1;
    const choices: string[] = [];

    for (const row of keyboard.rows) {
      for (const btn of row) {
        if (btn.callbackData) {
          this.activeKeyboard.set(index, btn.callbackData);
          choices.push(`\x1b[1m[${index}]\x1b[0m ${btn.text}`);
          index++;
        }
      }
    }

    if (choices.length > 0) {
      console.log(`\x1b[90mOptions: ${choices.join('  ')}\x1b[0m`);
    }
  }
}
