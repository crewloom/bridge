import type { IncomingChannelMessage } from '../../channels/channel.interface.js';
import type { RoomContext } from '../context.js';

export type MessageDeps = Pick<RoomContext, 'channel' | 'chatId' | 'session' | 'targetDir' | 'config' | 'actions'>;

/**
 * One link of the message chain. Returns true when it handled the message,
 * which stops the chain; false passes the message on to the next link.
 */
export type MessageHandler = (deps: MessageDeps, msg: IncomingChannelMessage, text: string) => Promise<boolean>;
