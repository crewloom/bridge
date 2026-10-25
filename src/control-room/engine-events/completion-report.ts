import type { OpenCodeRun } from '../../domain/types.js';
import { escapeHtml } from '../../telegram/telegram-client.js';
import { pick } from '../context.js';
import type { Language } from '../session.js';

export interface FinishSignal {
  failed: boolean;
  error?: string | undefined;
  exitCode?: unknown;
  output?: string | undefined;
  reasoning?: string | undefined;
}

const TERMINAL_MARKERS = ['Deploying', 'tests green', 'npm ', 'git '];
const REASONING_MIN_LENGTH = 20;

/** The message that closes a run: an error with details, the agent's reply, or a short summary of what ran. */
export function buildCompletionReport(
  run: OpenCodeRun,
  signal: FinishSignal,
  elapsedSeconds: number,
  language: Language
): string {
  const codeSuffix = signal.exitCode !== undefined ? ` (Exit: ${signal.exitCode})` : '';
  const header = signal.failed ? `❌ <b>Execution Failed${codeSuffix}</b>` : `✅ <b>Execution Finished</b>`;
  const replyText = (signal.output || run.assistantText || run.recentOutput || '').trim();
  const reasoning = (signal.reasoning || run.reasoningText || '').trim();

  if (signal.failed) {
    const detail = signal.error || replyText || 'Unknown error';
    return `${header}\n<pre><code>${escapeHtml(detail.slice(-3500))}</code></pre>`;
  }

  if (replyText) {
    const reply = reasoning.length > REASONING_MIN_LENGTH
      ? `💭 <i>[Thinking: ${escapeHtml(reasoning.slice(0, 250).trim())}...]</i>\n\n${replyText}`
      : replyText;
    const isTerminalLog = replyText.includes('\n') && TERMINAL_MARKERS.some((m) => replyText.includes(m));
    return `${header}\n${isTerminalLog ? `<pre><code>${escapeHtml(reply.slice(-3500))}</code></pre>` : reply}`;
  }

  const recent = (run.recentOutput || '').trim();
  const tail = recent
    ? pick(
        language,
        `\n\n📋 <b>آخر مخرجات:</b>\n<pre><code>${escapeHtml(recent.slice(-1500))}</code></pre>`,
        `\n\n📋 <b>Output:</b>\n<pre><code>${escapeHtml(recent.slice(-1500))}</code></pre>`
      )
    : '';
  return pick(
    language,
    `${header}\nاكتمل تنفيذ المهمة بنجاح! ⚡\n• الأوامر المنفذة: ⚙️ ${run.cmds}\n• الملفات المعدلة: 📝 ${run.files.size}\n• الوقت المستغرق: ⏳ ${elapsedSeconds} ثانية${tail}`,
    `${header}\nTask completed successfully! ⚡\n• Commands run: ⚙️ ${run.cmds}\n• Files touched: 📝 ${run.files.size}\n• Elapsed time: ⏳ ${elapsedSeconds}s${tail}`
  );
}
