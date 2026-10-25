import type { IncomingChannelMessage } from '../../channels/channel.interface.js';
import { runChangeDirectory, runFixedCommand } from './commands.js';
import { answerIdentity, answerInquiry } from './inquiry.js';
import { resolveMention } from './mentions.js';
import type { MessageDeps, MessageHandler } from './types.js';

export type { MessageDeps } from './types.js';
export { classifyInquiry } from './inquiry.js';

/** The chain a message passes through, in priority order. A message nobody handles is a prompt. */
const CHAIN: MessageHandler[] = [answerInquiry, answerIdentity, runFixedCommand, runChangeDirectory, resolveMention];

export async function handleUserMessage(deps: MessageDeps, msg: IncomingChannelMessage): Promise<void> {
  const text = (msg.text || '').trim();
  if (!text) return;
  for (const handle of CHAIN) {
    if (await handle(deps, msg, text)) return;
  }
  await deps.actions.guardedSubmit(text, msg.id);
}
