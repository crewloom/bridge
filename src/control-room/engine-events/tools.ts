import type { EventHandler } from './types.js';

/** Remembers the latest stdout/stderr chunk so a finished run without a reply can still show something. */
export const onToolOutput: EventHandler = async (_deps, _event, props, run) => {
  const tail = String(props.tail || props.chunk || '');
  if (tail) run.recentOutput = tail;
};

/** A tool started: count it and track it in the run. */
export const onToolStarted: EventHandler = async (_deps, _event, props, run) => {
  run.cmds++;
  const toolId = String(props.id || Math.random());
  const metadata = (props.metadata || {}) as Record<string, unknown>;
  const command = String(metadata.command || props.title || '');
  if (command) run.currentCommand = command;
  run.tools[toolId] = {
    id: toolId,
    tool: String(props.tool || 'bash'),
    status: 'running',
    title: String(props.title || ''),
  };
  if (!run.toolOrder.includes(toolId)) run.toolOrder.push(toolId);
};
