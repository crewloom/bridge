import type { ChannelKeyboard } from '../../channels/channel.interface.js';
import type { OpenCodeRun } from '../../domain/types.js';
import { escapeHtml } from '../../telegram/telegram-client.js';
import { pick } from '../context.js';
import type { Language } from '../session.js';

/** Words that cancel a run in progress. Compared lowercase against the whole message. */
export const INTERRUPT_WORDS: ReadonlySet<string> = new Set([
  'stop', '/stop', 'وقف', 'إيقاف', 'الغاء', 'إلغاء', 'كنسل', 'abort', 'cancel',
]);

/** Words that ask how far the run in progress is. */
export const PROGRESS_WORDS: ReadonlySet<string> = new Set([
  'st', '/status', 'status', 'شغال', 'شغال؟', 'خلصت؟', 'خلصت', 'الحالة', 'فينك',
]);

const elapsedSeconds = (run: OpenCodeRun): number => Math.round((Date.now() - run.startedAt) / 1000);

function stopAndStatusKeyboard(stopLabel: string, statusLabel: string): ChannelKeyboard {
  return { rows: [[{ text: stopLabel, callbackData: 'stop' }, { text: statusLabel, callbackData: 'st' }]] };
}

/** What the owner sees when asking for progress while the agent works. */
export function progressReply(run: OpenCodeRun, language: Language): { text: string; keyboard: ChannelKeyboard } {
  const elapsed = elapsedSeconds(run);
  const activeCmd = run.currentCommand
    ? `<code>${escapeHtml(run.currentCommand.slice(0, 150))}</code>`
    : '<i>جاري التفكير والتنفيذ...</i>';
  const text = pick(
    language,
    `⚙️ <b>الوكيل يعمل حالياً:</b>\n` +
      `• الأمر النشط: ${activeCmd}\n` +
      `• الأوامر المنفذة: ⚙️ ${run.cmds} · الملفات: 📝 ${run.files.size}\n` +
      `• المدة المنقضية: ⏳ ${elapsed} ثانية\n\n` +
      `<i>أرسل "وقف" لإلغاء المهمة في أي وقت.</i>`,
    `⚙️ <b>Agent is actively executing:</b>\n` +
      `• Active command: ${activeCmd}\n` +
      `• Commands run: ⚙️ ${run.cmds} · Files: 📝 ${run.files.size}\n` +
      `• Elapsed time: ⏳ ${elapsed}s\n\n` +
      `<i>Send "stop" to abort anytime.</i>`
  );
  return {
    text,
    keyboard: stopAndStatusKeyboard(
      pick(language, '🛑 إيقاف المهمة', '🛑 Stop Task'),
      pick(language, '📊 تحديث الحالة', '📊 Refresh Status')
    ),
  };
}

/** What the owner sees when sending a new prompt while the agent is still busy. */
export function busyNotice(run: OpenCodeRun, language: Language): { text: string; keyboard: ChannelKeyboard } {
  const elapsed = elapsedSeconds(run);
  const snippet = escapeHtml((run.currentCommand || 'جاري معالجة الخطوات').slice(0, 120));
  const text = pick(
    language,
    `⚠️ <b>الوكيل يعمل حالياً على مهمة سابقة (مرت ⏳ ${elapsed} ثانية):</b>\n` +
      `• النشاط الحالي: <code>${snippet}</code>\n\n` +
      `انتظر انتهاء المهمة أو اضغط "إيقاف" لبدء طلبك الجديد فوراً.`,
    `⚠️ <b>Agent is currently busy (${elapsed}s elapsed):</b>\n` +
      `• Current action: <code>${snippet}</code>\n\n` +
      `Wait for it to finish or click "Stop" to start your new task immediately.`
  );
  return {
    text,
    keyboard: stopAndStatusKeyboard(
      pick(language, '🛑 إيقاف المهمة والبدء بهذا', '🛑 Stop & Start New'),
      pick(language, '📊 تقرير الحالة', '📊 Status Report')
    ),
  };
}
