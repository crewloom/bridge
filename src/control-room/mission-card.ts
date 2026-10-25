import type { RoomContext } from './context.js';
import { renderMissionCard } from './views/index.js';

const REFRESH_MS = 2500;

type MissionCardDeps = Pick<RoomContext, 'channel' | 'chatId' | 'engine' | 'session' | 'targetDir' | 'actions'>;

/** The live "mission card" message: posted when a run starts, refreshed while it runs, frozen when it ends. */
export class MissionCard {
  private messageId: string | number | null = null;
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly deps: MissionCardDeps) {}

  render(): string {
    const { session, engine, channel, targetDir } = this.deps;
    return renderMissionCard({
      run: session.activeRun,
      currentModel: session.currentModel,
      engineName: engine.name,
      channelName: channel.name,
      targetDir,
    });
  }

  async post(replyToMessageId?: string | number): Promise<void> {
    const { channel, chatId, actions } = this.deps;
    const sent = await channel.sendMessage(chatId, this.render(), {
      replyToMessageId,
      replyMarkup: actions.getMainKeyboard(),
    });
    this.messageId = sent.messageId;
  }

  startRefreshing(): void {
    this.stopRefreshing();
    this.timer = setInterval(() => {
      const { channel, chatId, session } = this.deps;
      if (session.isBusy) channel.sendChatAction?.(chatId, 'typing').catch(() => {});
      this.update(false).catch(() => {});
    }, REFRESH_MS);
  }

  stopRefreshing(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async update(final = false): Promise<void> {
    if (!this.messageId) return;
    if (final) this.stopRefreshing();
    try {
      const { channel, chatId, actions } = this.deps;
      await channel.editMessage(chatId, this.messageId, this.render(), { replyMarkup: actions.getMainKeyboard() });
    } catch {}
  }
}
