import type { ExecutionMode, OpenCodeRun } from '../domain/types.js';

export interface NewRunInput {
  sessionId: string;
  prompt: string;
  agent: string;
  model: string;
  mode: ExecutionMode;
  initialActivity: string;
  userMsgId?: number | undefined;
  now?: number;
}

/** Builds the empty bookkeeping record for a run that has just started. */
export function createRun(input: NewRunInput): OpenCodeRun {
  return {
    sessionId: input.sessionId,
    prompt: input.prompt,
    currentActivity: input.initialActivity,
    agent: input.agent,
    model: input.model,
    mode: input.mode,
    startedAt: input.now ?? Date.now(),
    userMsgId: input.userMsgId,
    userMessages: new Set([input.prompt]),
    text: {},
    textOrder: [],
    msgOfPart: {},
    tools: {},
    toolOrder: [],
    files: new Set(),
    cmds: 0,
    busy: true,
    done: false,
    completionDelivered: false,
  };
}
