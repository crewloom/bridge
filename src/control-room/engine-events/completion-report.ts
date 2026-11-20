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
  /** Results of verifiers the harness ran. Absent or empty means nothing verified the work. */
  verifiers?: readonly VerifierEvidence[] | undefined;
}

export interface VerifierEvidence {
  name: string;
  status: 'pass' | 'fail' | 'timedOut' | 'unavailable' | 'error';
}

export type CompletionStatus = 'verified' | 'failed' | 'unverified';

/** Mirrors the contracts `decideCompletion` rule: unavailable and error never count, one failure wins, no evidence is unverified. */
export function completionStatus(verifiers: readonly VerifierEvidence[] = []): CompletionStatus {
  const ran = verifiers.filter((v) => v.status === 'pass' || v.status === 'fail' || v.status === 'timedOut');
  if (ran.length === 0) return 'unverified';
  return ran.some((v) => v.status !== 'pass') ? 'failed' : 'verified';
}

const STATUS_ICON: Record<VerifierEvidence['status'], string> = {
  pass: '✅', fail: '❌', timedOut: '⏱', unavailable: '➖', error: '⚠️',
};

function verifierLines(verifiers: readonly VerifierEvidence[], language: Language): string {
  if (verifiers.length === 0) {
    return pick(language, 'لم يُشغَّل أي فاحص (verifier).', 'No verifier ran.');
  }
  return verifiers.map((v) => `${STATUS_ICON[v.status]} ${escapeHtml(v.name)}: ${v.status}`).join('\n');
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
  const status = completionStatus(signal.verifiers);
  const header = signal.failed
    ? `❌ <b>Execution Failed${codeSuffix}</b>`
    : pick(
        language,
        status === 'verified' ? '✅ <b>تم التحقق</b>' : status === 'failed' ? '❌ <b>فشل التحقق</b>' : '⚠️ <b>غير مُتحقَّق منه (UNVERIFIED)</b>',
        status === 'verified' ? '✅ <b>Verified</b>' : status === 'failed' ? '❌ <b>Verification Failed</b>' : '⚠️ <b>UNVERIFIED</b>'
      );
  const evidence = signal.failed ? '' : `${verifierLines(signal.verifiers ?? [], language)}\n\n`;
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
    const claim = pick(language, '🗣 <b>ادّعاء الوكيل (غير مُتحقَّق):</b>', '🗣 <b>Agent claim (not verified):</b>');
    return `${header}\n${evidence}${claim}\n${isTerminalLog ? `<pre><code>${escapeHtml(reply.slice(-3500))}</code></pre>` : reply}`;
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
    `${header}\n${evidence}توقف الوكيل؛ لا يُعدّ هذا إنجازًا ما لم تنجح الفحوص.\n• الأوامر المنفذة: ⚙️ ${run.cmds}\n• الملفات المعدلة: 📝 ${run.files.size}\n• الوقت المستغرق: ⏳ ${elapsedSeconds} ثانية${tail}`,
    `${header}\n${evidence}The agent stopped; this is not completion unless the checks pass.\n• Commands run: ⚙️ ${run.cmds}\n• Files touched: 📝 ${run.files.size}\n• Elapsed time: ⏳ ${elapsedSeconds}s${tail}`
  );
}
