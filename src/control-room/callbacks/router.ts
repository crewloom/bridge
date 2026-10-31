import type { RoomContext } from '../context.js';

export type CallbackDeps = Pick<
  RoomContext,
  'channel' | 'engine' | 'chatId' | 'session' | 'policy' | 'targetDir' | 'config' | 'actions'
>;

/** One button press, with the part of the callback data after the matched prefix already split off. */
export interface CallbackCall {
  readonly data: string;
  readonly arg: string;
  readonly messageId?: string | number | undefined;
  /** Answers the button press. Only the first call is sent; later calls are ignored. */
  toast(text?: string): Promise<void>;
}

/** A command bound to a callback key. */
export type CallbackHandler = (deps: CallbackDeps, call: CallbackCall) => Promise<void>;

/**
 * Routes callback data to handlers: an exact key wins, otherwise the longest registered prefix.
 * Unmatched data is acknowledged and ignored, so a button never keeps spinning.
 */
export class CallbackRouter {
  private readonly exact = new Map<string, CallbackHandler>();
  private prefixes: Array<{ prefix: string; handler: CallbackHandler }> = [];

  /** Binds `handler` to callback data equal to `key`. */
  on(key: string, handler: CallbackHandler): this {
    this.exact.set(key, handler);
    return this;
  }

  /** Binds `handler` to callback data starting with `prefix`; the rest arrives as `call.arg`. */
  onPrefix(prefix: string, handler: CallbackHandler): this {
    this.prefixes.push({ prefix, handler });
    this.prefixes.sort((a, b) => b.prefix.length - a.prefix.length);
    return this;
  }

  async dispatch(
    deps: CallbackDeps,
    callbackId: string,
    data: string,
    messageId?: string | number
  ): Promise<void> {
    let answered = false;
    const toast = async (text?: string): Promise<void> => {
      if (answered) return;
      answered = true;
      await deps.channel.answerAction(callbackId, text);
    };

    const route = this.resolve(data);
    if (route) await route.handler(deps, { data, arg: route.arg, messageId, toast });
    await toast();
  }

  private resolve(data: string): { handler: CallbackHandler; arg: string } | null {
    const handler = this.exact.get(data);
    if (handler) return { handler, arg: '' };
    const match = this.prefixes.find((p) => data.startsWith(p.prefix));
    return match ? { handler: match.handler, arg: data.slice(match.prefix.length) } : null;
  }
}
