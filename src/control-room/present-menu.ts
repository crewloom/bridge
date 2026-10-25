import type { IChannelAdapter } from '../channels/channel.interface.js';
import type { InlineKeyboardButton } from '../domain/types.js';
import { wrapKeyboard } from './keyboards.js';

/**
 * Shows a menu card: edits `editMsgId` in place when given, and sends a new message when
 * there is nothing to edit or the edit is rejected by the channel.
 */
export async function presentMenu(
  channel: IChannelAdapter,
  chatId: string,
  view: { text: string; rows: InlineKeyboardButton[][] },
  editMsgId?: string | number
): Promise<void> {
  const replyMarkup = wrapKeyboard(view.rows);
  if (editMsgId !== undefined) {
    try {
      await channel.editMessage(chatId, editMsgId, view.text, { replyMarkup });
      return;
    } catch {}
  }
  await channel.sendMessage(chatId, view.text, { replyMarkup });
}
