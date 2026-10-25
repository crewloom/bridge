import type { ChannelMessageResult, ChannelSendOptions } from '../channels/channel.interface.js';
import type { RoomContext } from './context.js';

/** Sends a message to the owner's chat. */
export function say(
  ctx: Pick<RoomContext, 'channel' | 'chatId'>,
  text: string,
  options?: ChannelSendOptions
): Promise<ChannelMessageResult> {
  return ctx.channel.sendMessage(ctx.chatId, text, options);
}

/** Sends a message with the home keyboard attached. */
export function sayWithMenu(
  ctx: Pick<RoomContext, 'channel' | 'chatId' | 'actions'>,
  text: string,
  options: Omit<ChannelSendOptions, 'replyMarkup'> = {}
): Promise<ChannelMessageResult> {
  return ctx.channel.sendMessage(ctx.chatId, text, { ...options, replyMarkup: ctx.actions.getMainKeyboard() });
}
