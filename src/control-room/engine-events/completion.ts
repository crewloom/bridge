import { escapeHtml } from '../../telegram/telegram-client.js';
import { sayWithMenu } from '../reply.js';
import { buildCompletionReport } from './completion-report.js';
import type { EventHandler } from './types.js';

/** The run ended: freeze the mission card and send the outcome once, however many finish events arrive. */
export const onRunFinished: EventHandler = async (deps, _event, props, run) => {
  if (run.completionDelivered) return;
  const { session } = deps;

  const failed = props.status === 'error' || Boolean(props.error);
  run.busy = false;
  run.done = true;
  run.completionDelivered = true;
  if (props.output) run.lastResultOutput = String(props.output);
  if (props.error) run.error = String(props.error);

  const elapsed = Math.round((Date.now() - run.startedAt) / 1000);
  session.recordExecution(elapsed, !failed);
  await deps.missionCard.update(true);

  const report = buildCompletionReport(
    run,
    {
      failed,
      error: props.error ? String(props.error) : undefined,
      exitCode: props.code,
      output: props.output ? String(props.output) : undefined,
      reasoning: props.reasoning ? String(props.reasoning) : undefined,
    },
    elapsed,
    session.currentLanguage
  );
  await sayWithMenu(deps, report);
};

/** The engine reported a session error: end the run and show the message. */
export const onSessionError: EventHandler = async (deps, _event, props) => {
  const error = (props.error || {}) as Record<string, unknown>;
  const data = (error.data || {}) as Record<string, unknown>;
  const message = String(data.message || error.message || error.name || 'Session error');

  deps.session.endRun(message);
  await deps.missionCard.update(true);
  await sayWithMenu(deps, `❌ <b>OpenCode Error</b>\n<pre><code>${escapeHtml(message.slice(0, 3500))}</code></pre>`);
};
