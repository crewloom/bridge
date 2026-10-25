import { pick } from '../context.js';
import { say, sayWithMenu } from '../reply.js';
import { readGitBranch } from '../git-summary.js';
import { renderBusyTaskCard, renderIdleStatusCard, renderPresenceWelcomeCard } from '../views/index.js';
import type { MessageHandler } from './types.js';

const TASK_STATUS_KEYWORDS = [
  'حاله', 'حالة', 'وضع', 'تاسك', 'برومت', 'ارن', 'اعيد', 'تاني', 'خلص', 'انتهى',
  'task status', 'did it finish', 'is it done', 'is it running',
];
const TASK_STATUS_EXACT = new Set(['status', 'st', '/status']);
const PRESENCE_EXACT = new Set([
  'هل انت شغال', 'هل أنت شغال', 'انت شغال', 'أنت شغال', 'شغال',
  'are you working', 'are you online', 'are you there', 'ping',
]);
const IDENTITY_EXACT = new Set(['من انت', 'مين انت', 'ماذا تفعل', 'who are you', 'what do you do']);

const ARABIC_LETTERS = /[؀-ۿ]/;

/** Lowercases and strips sentence punctuation so "Status?" and "status" compare equal. */
const normalize = (text: string): string => text.toLowerCase().replace(/[؟?!.,:;]/g, '').trim();

export type Inquiry = 'task-status' | 'presence' | null;

/** Classifies conversational status questions ("هل انت شغال؟", "did it finish"). Presence wins over task status. */
export function classifyInquiry(text: string): Inquiry {
  const norm = normalize(text);
  if (PRESENCE_EXACT.has(norm)) return 'presence';
  const isTaskStatus = TASK_STATUS_EXACT.has(norm) || TASK_STATUS_KEYWORDS.some((k) => norm.includes(k));
  return isTaskStatus ? 'task-status' : null;
}

const replyingTo = (id: string | number) => ({ replyToMessageId: id });

/** Answers "are you there?" and "what is the task status?" without involving the agent engine. */
export const answerInquiry: MessageHandler = async (deps, msg, text) => {
  const inquiry = classifyInquiry(text);
  if (!inquiry) return false;

  const { session, targetDir } = deps;
  const isAr = session.currentLanguage === 'ar' || ARABIC_LETTERS.test(text);

  if (session.activeRun?.busy) {
    await say(deps, renderBusyTaskCard({ run: session.activeRun, currentModel: session.currentModel, isAr }), {
      ...replyingTo(msg.id),
      replyMarkup: {
        rows: [[
          { text: isAr ? '🛑 إيقاف المهمة' : '🛑 Stop Task', callbackData: 'stop' },
          { text: isAr ? '📊 تحديث الحالة' : '📊 Refresh Status', callbackData: 'st' },
        ]],
      },
    });
    return true;
  }

  const branch = readGitBranch(targetDir);
  const card = inquiry === 'task-status'
    ? renderIdleStatusCard({
        targetDir,
        branch,
        currentModel: session.currentModel,
        lastPrompt: session.lastPrompt,
        lastExecutionElapsed: session.lastElapsedSeconds,
        lastExecutionSuccess: session.lastSucceeded,
        isAr,
      })
    : renderPresenceWelcomeCard({
        targetDir,
        branch,
        currentModel: session.currentModel,
        activeSkill: session.activeSkill,
        isAr,
      });
  await sayWithMenu(deps, card, replyingTo(msg.id));
  return true;
};

/** "Who are you?" gets a fixed introduction. */
export const answerIdentity: MessageHandler = async (deps, msg, text) => {
  if (!IDENTITY_EXACT.has(normalize(text))) return false;
  const isAr = deps.session.currentLanguage === 'ar' || ARABIC_LETTERS.test(text);
  const intro = pick(
    isAr ? 'ar' : 'en',
    `⚡ <b>أنا AgentGram — غرفة التحكم والعمليات المباشرة لـ Rveta!</b> 🚀\n\n` +
      `أعمل كحلقة وصل تفاعلية حية بينك وبين السيرفر عبر تليجرام، مع دعم كامل لـ:\n` +
      `• تنفيذ المهارات الـ 58 وحوكمة الأكواد والتصميم\n` +
      `• تشغيل ومراقبة نشر Pinpoint Ops حياً عبر السيرفر (<code>/pinpoint_go</code>)\n` +
      `• تشغيل أوامر السيرفر وعرض مخرجات الـ Terminal بثاً حياً\n` +
      `• حماية السيرفر من أي أوامر مدمرة أو ثغرات أمنية\n\n` +
      `<i>اضغط على <b>/</b> لبدء تجربة المهارات فوراً.</i>`,
    `⚡ <b>I am AgentGram — AI Mission Control for Rveta!</b> 🚀\n\n` +
      `Your direct interactive bridge to the server over Telegram, supporting:\n` +
      `• Executing all 58 governed agent skills\n` +
      `• Running Pinpoint Ops rollout & deployment pipeline (<code>/pinpoint_go</code>)\n` +
      `• Live terminal streaming of command executions\n` +
      `• Complete security policy & prompt injection guards\n\n` +
      `<i>Type <b>/</b> to browse skills and commands.</i>`
  );
  await sayWithMenu(deps, intro, replyingTo(msg.id));
  return true;
};
