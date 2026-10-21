/**
 * Status & Presence Cards View Builder
 * Responsible for rendering conversational inquiry replies, idle status, busy status, and git health.
 */
import * as path from 'node:path';
import { resolveModelMetadata } from '../../domain/model-catalog.js';
import { escapeHtml } from '../../telegram/telegram-client.js';
import type { OpenCodeRun } from '../../domain/types.js';

export function renderBusyTaskCard(options: {
  run: OpenCodeRun;
  currentModel: string;
  isAr: boolean;
}): string {
  const { run, currentModel, isAr } = options;
  const elapsed = Math.round((Date.now() - run.startedAt) / 1000);
  const promptSnippet = run.prompt ? escapeHtml(run.prompt.slice(0, 150)) : '';
  const activeCmd = run.currentCommand
    ? `<code>${escapeHtml(run.currentCommand.slice(0, 150))}</code>`
    : (isAr ? '<i>🧠 جاري التفكير ومعالجة الأكواد...</i>' : '<i>🧠 Thinking & processing code...</i>');

  return isAr
    ? `⏳ <b>المهمة قيد التشغيل حالياً! (لا تقم بإعادة إرسال البرومت الآن)</b>\n\n` +
      (promptSnippet ? `📝 <b>الطلب:</b> <code>${promptSnippet}</code>\n` : '') +
      `⚙️ <b>النشاط الحالي:</b> ${activeCmd}\n` +
      `🤖 <b>الموديل:</b> <code>${escapeHtml(currentModel)}</code>\n` +
      `⏱️ <b>المدة المنقضية:</b> ⏳ ${elapsed} ثانية\n` +
      `📊 <b>الأوامر المنفذة:</b> ⚙️ ${run.cmds} · 📝 ${run.files.size} ملفات\n\n` +
      `💡 <i>الموديل مستمر بالعمل وسيرسل لك الجواب فور الانتهاء مباشرة!</i>`
    : `⏳ <b>Task is actively executing! (Do not re-run yet)</b>\n\n` +
      (promptSnippet ? `📝 <b>Prompt:</b> <code>${promptSnippet}</code>\n` : '') +
      `⚙️ <b>Active Action:</b> ${activeCmd}\n` +
      `🤖 <b>Model:</b> <code>${escapeHtml(currentModel)}</code>\n` +
      `⏱️ <b>Elapsed:</b> ⏳ ${elapsed}s\n` +
      `📊 <b>Progress:</b> ⚙️ ${run.cmds} commands · 📝 ${run.files.size} files\n\n` +
      `💡 <i>Execution is underway and full results will be delivered automatically.</i>`;
}

export function renderIdleStatusCard(options: {
  targetDir: string;
  branch: string;
  currentModel: string;
  lastPrompt: string;
  lastExecutionElapsed: number;
  lastExecutionSuccess: boolean;
  isAr: boolean;
}): string {
  const { targetDir, branch, currentModel, lastPrompt, lastExecutionElapsed, lastExecutionSuccess, isAr } = options;
  const curMeta = resolveModelMetadata(currentModel);
  const lastPromptSnippet = lastPrompt ? escapeHtml(lastPrompt.slice(0, 140)) : '';
  const lastTime = lastExecutionElapsed > 0 ? `${lastExecutionElapsed}s` : (isAr ? 'سريعاً' : 'fast');
  const lastStatus = lastExecutionSuccess
    ? (isAr ? '✅ انتهت بنجاح' : '✅ Succeeded')
    : (isAr ? '❌ فشلت أو تم إيقافها' : '❌ Failed or Stopped');

  return isAr
    ? `🟢 <b>النظام متصل وفي وضع الاستعداد (Idle) — لا توجد مهمة قيد التشغيل حالياً</b> ⚡\n\n` +
      (lastPrompt
        ? `📋 <b>آخر طلب نُفّذ:</b> <code>${lastPromptSnippet}</code>\n` +
          `🏁 <b>النتيجة:</b> ${lastStatus} (استغرقت ⏳ ${lastTime})\n\n`
        : '') +
      `📁 <b>المشروع:</b> <code>${escapeHtml(path.basename(targetDir))}</code>\n` +
      `🌿 <b>فرع Git:</b> <code>${escapeHtml(branch)}</code>\n` +
      `🧠 <b>الموديل:</b> <code>${escapeHtml(curMeta.name)}</code> (${escapeHtml(curMeta.contextWindow)})\n\n` +
      `💡 <b>الجواب لسؤالك:</b> نعم، يمكنك إرسال أي برومت جديد الآن أو إعادة تشغيل أي طلب، النظام جاهز تماماً!`
    : `🟢 <b>Online and Idle — No task is currently executing</b> ⚡\n\n` +
      (lastPrompt
        ? `📋 <b>Last executed task:</b> <code>${lastPromptSnippet}</code>\n` +
          `🏁 <b>Status:</b> ${lastStatus} (took ⏳ ${lastTime})\n\n`
        : '') +
      `📁 <b>Workspace:</b> <code>${escapeHtml(path.basename(targetDir))}</code>\n` +
      `🌿 <b>Git Branch:</b> <code>${escapeHtml(branch)}</code>\n` +
      `🧠 <b>Active Model:</b> <code>${escapeHtml(curMeta.name)}</code> (${escapeHtml(curMeta.contextWindow)})\n\n` +
      `💡 <b>Answer:</b> System is ready. You can safely send a new prompt or re-run any command now!`;
}

export function renderPresenceWelcomeCard(options: {
  targetDir: string;
  branch: string;
  currentModel: string;
  activeSkill: string | null;
  isAr: boolean;
}): string {
  const { targetDir, branch, currentModel, activeSkill, isAr } = options;
  const curMeta = resolveModelMetadata(currentModel);

  return isAr
    ? `🟢 <b>أهلاً بك! نعم، أنا أعمل حياً ومتصل بالسيرفر بنجاح!</b> ⚡\n\n` +
      `📁 <b>المشروع:</b> <code>${escapeHtml(path.basename(targetDir))}</code>\n` +
      `🌿 <b>فرع Git:</b> <code>${escapeHtml(branch)}</code>\n` +
      `🧠 <b>الموديل:</b> <code>${escapeHtml(curMeta.name)}</code> (سياق: <code>${escapeHtml(curMeta.contextWindow)}</code>)\n` +
      `🧰 <b>المهارة النشطة:</b> <code>${escapeHtml(activeSkill || 'عامة')}</code>\n` +
      `💻 <b>بيئة العمل:</b> Linux VPS (141.253.114.101)\n\n` +
      `<b>جاهز لتنفيذ طلباتك:</b>\n` +
      `• اضغط <b>/</b> لاختيار المهارات السريعة (مثل <code>/pinpoint_go</code> أو <code>/frontend</code>).\n` +
      `• اكتب أي أمر طرفية مباشر (مثل <code>git status</code> أو <code>free -m</code>).\n` +
      `• استخدم الأزرار أدناه للتحكم الشامل.`
    : `🟢 <b>Yes, I am online, active, and fully connected to the server!</b> ⚡\n\n` +
      `📁 <b>Workspace:</b> <code>${escapeHtml(path.basename(targetDir))}</code>\n` +
      `🌿 <b>Git Branch:</b> <code>${escapeHtml(branch)}</code>\n` +
      `🧠 <b>Active Model:</b> <code>${escapeHtml(curMeta.name)}</code> (${escapeHtml(curMeta.contextWindow)})\n` +
      `🧰 <b>Active Skill:</b> <code>${escapeHtml(activeSkill || 'General')}</code>\n` +
      `💻 <b>Environment:</b> Linux VPS (141.253.114.101)\n\n` +
      `<b>Ready to assist:</b>\n` +
      `• Type <b>/</b> to autocomplete skills (like <code>/pinpoint_go</code> or <code>/frontend</code>).\n` +
      `• Enter direct shell commands (e.g. <code>git status</code> or <code>free -m</code>).\n` +
      `• Use the mission control buttons below.`;
}

export function renderSystemStatusReport(options: {
  targetDir: string;
  currentAgent: string;
  engineName: string;
  currentModel: string;
  currentMode: string;
  channelName: string;
  sessionId?: string | undefined;
  isBusy: boolean;
  branch: string;
  dirtyCount: number;
  activeRun?: {
    startedAt: number;
    prompt?: string | undefined;
    cmds: number;
    filesCount: number;
  } | undefined;
  lastPrompt?: string | undefined;
  lastExecutionSuccess?: boolean | undefined;
  lastExecutionElapsed?: number | undefined;
}): string {
  const {
    targetDir,
    currentAgent,
    engineName,
    currentModel,
    currentMode,
    channelName,
    sessionId,
    isBusy,
    branch,
    dirtyCount,
    activeRun,
    lastPrompt,
    lastExecutionSuccess,
    lastExecutionElapsed,
  } = options;

  const busyStatus = isBusy ? '🟢 Running' : '⏸ Idle';
  let text = `
📊 <b>System & Mission Control Status</b>
📁 Workspace: <b>${escapeHtml(path.basename(targetDir))}</b>
<code>${escapeHtml(targetDir)}</code>
🧠 Agent: <b>${escapeHtml(currentAgent)}</b> (${escapeHtml(engineName)})
🤖 Model: <b>${escapeHtml(currentModel || 'Default')}</b>
🔒 Mode: <b>${escapeHtml(currentMode)}</b>
📡 Channel: <b>${escapeHtml(channelName)}</b>
📂 Session: <code>${escapeHtml(sessionId || 'None (Ready)')}</code>
⏳ Status: <b>${busyStatus}</b>
🌿 Git Branch: <code>${escapeHtml(branch)}</code> · Modified files: <b>${dirtyCount}</b>
`.trim();

  if (activeRun) {
    const elapsed = Math.round((Date.now() - activeRun.startedAt) / 1000);
    text += `\n\n⚙️ <b>Current Execution:</b>\n`;
    if (activeRun.prompt) {
      text += `• Prompt: <code>${escapeHtml(activeRun.prompt.slice(0, 140))}</code>\n`;
    }
    text += `• Elapsed: ⏳ ${elapsed}s\n`;
    text += `• Actions: ⚙️ ${activeRun.cmds} commands · 📝 ${activeRun.filesCount} files`;
  } else if (lastPrompt) {
    text += `\n\n📋 <b>Last Task:</b>\n<code>${escapeHtml(lastPrompt.slice(0, 140))}</code>\n• Status: ${lastExecutionSuccess ? '✅ Finished' : '❌ Failed/Stopped'} (${lastExecutionElapsed ?? 0}s)`;
  }

  return text;
}

