import type { InlineKeyboardButton } from '../../domain/types.js';
import { type SupportedLanguage, t } from '../../i18n/index.js';
import { escapeHtml } from '../../telegram/telegram-client.js';

export function buildAgentsMenuView(
  currentAgent: string,
  language: SupportedLanguage
): { text: string; rows: InlineKeyboardButton[][] } {
  const agents = ['build', 'delegate', 'explorer', 'code-review'];
  const rows: InlineKeyboardButton[][] = [];
  let currentRow: InlineKeyboardButton[] = [];

  for (const a of agents) {
    const isCurrent = a === currentAgent;
    currentRow.push({
      text: `${isCurrent ? '● ' : ''}${a}`,
      callback_data: `ag:${a}`,
    });
    if (currentRow.length === 2) {
      rows.push(currentRow);
      currentRow = [];
    }
  }
  if (currentRow.length > 0) rows.push(currentRow);
  rows.push([{ text: t('btn_back', language), callback_data: 'menu:home' }]);

  const text = t('select_agent', language, { agent: escapeHtml(currentAgent) });
  return { text, rows };
}

export function buildModeMenuView(
  currentMode: string,
  language: SupportedLanguage
): { text: string; rows: InlineKeyboardButton[][] } {
  const rows: InlineKeyboardButton[][] = [
    [
      { text: `${currentMode === 'read' ? '● ' : ''}🔒 Read-Only`, callback_data: 'mo:read' },
      { text: `${currentMode === 'build' ? '● ' : ''}🔨 Build (Interactive)`, callback_data: 'mo:build' },
      { text: `${currentMode === 'auto' ? '● ' : ''}⚡ Auto Mode`, callback_data: 'mo:auto' },
    ],
    [
      { text: t('btn_back', language), callback_data: 'menu:home' },
    ],
  ];

  const text = t('select_mode', language, { mode: currentMode });
  return { text, rows };
}

export function buildSessionsMenuView(
  activeSessionId: string | undefined,
  language: SupportedLanguage
): { text: string; rows: InlineKeyboardButton[][] } {
  const rows: InlineKeyboardButton[][] = [
    [{ text: '✨ ' + t('btn_new', language), callback_data: 'new' }],
  ];
  if (activeSessionId) {
    rows.unshift([{
      text: `● Session: ${activeSessionId.slice(0, 16)}…`,
      callback_data: `se:${activeSessionId}`,
    }]);
  }
  rows.push([{ text: t('btn_back', language), callback_data: 'menu:home' }]);

  const text = `📂 <b>Active Sessions</b>\nCurrent: <code>${escapeHtml(activeSessionId || 'None (New)')}</code>`;
  return { text, rows };
}

export function buildLanguageMenuView(
  currentLanguage: SupportedLanguage
): { text: string; rows: InlineKeyboardButton[][] } {
  const rows: InlineKeyboardButton[][] = [
    [{ text: `${currentLanguage === 'en' ? '● ' : ''}🇺🇸 English`, callback_data: 'lang:en' }],
    [{ text: `${currentLanguage === 'ar' ? '● ' : ''}🇸🇦 العربية`, callback_data: 'lang:ar' }],
    [{ text: t('btn_back', currentLanguage), callback_data: 'menu:home' }],
  ];

  const text = t('select_language', currentLanguage);
  return { text, rows };
}

export function buildWorkspaceMenuView(
  workspaces: string[],
  currentWorkspace: string,
  language: SupportedLanguage
): { text: string; rows: InlineKeyboardButton[][] } {
  const rows: InlineKeyboardButton[][] = workspaces.map((ws, i) => [
    {
      text: `${ws === currentWorkspace ? '👉 ' : ''}${ws.split('/').pop() || ws}`,
      callback_data: `ws:${i}`,
    },
  ]);
  rows.push([{ text: t('btn_back', language), callback_data: 'menu:home' }]);

  const text = t('select_workspace', language, { ws: escapeHtml(currentWorkspace) });
  return { text, rows };
}

export function buildMentionsHubView(
  language: SupportedLanguage
): { text: string; rows: InlineKeyboardButton[][] } {
  const isAr = language === 'ar';

  const card = isAr
    ? `⚡ <b>مركز المنشن والاختصارات السريعة (@)</b>\n\n` +
      `اختر ما يناسبك أدناه أو اكتب في الشات <code>@name</code> مباشرة:\n\n` +
      `🧰 <b>المهارات السريعة (Skills):</b>\n` +
      `• <code>@pinpoint_go</code> — نشر وفحص Pinpoint Ops على السيرفر\n` +
      `• <code>@frontend</code> — حوكمة Vue 3 / Inertia / Admin-Vue\n` +
      `• <code>@erp_debug</code> — تدقيق ERP والقيود المزدوجة\n` +
      `• <code>@query_perf</code> — فحص أداء الاستعلامات والفهارس\n\n` +
      `🧠 <b>الموديلات وسياق الذاكرة (Models):</b>\n` +
      `• <code>@claude</code> — Claude 3.5 Sonnet (200k)\n` +
      `• <code>@gemini</code> — Gemini 2.0 Flash (1M)\n` +
      `• <code>@gpt4o</code> — GPT-4o (128k)\n` +
      `• <code>@deepseek</code> — DeepSeek Chat (128k)\n\n` +
      `🤖 <b>الأيجنتس (Agents):</b>\n` +
      `• <code>@build</code> — مهندس التنفيذ المباشر\n` +
      `• <code>@plan</code> — التخطيط والتحليل المعماري\n` +
      `• <code>@review</code> — مراجعة وتدقيق الجودة\n\n` +
      `<i>💡 نصيحة: يمكنك كتابة <code>@frontend ظبط أزرار المودال</code> أو <code>@plan خطط للميزة</code></i>`
    : `⚡ <b>Mentions & Instant Shortcuts Hub (@)</b>\n\n` +
      `Select from below or type <code>@name</code> directly in chat:\n\n` +
      `🧰 <b>Governed Skills:</b>\n` +
      `• <code>@pinpoint_go</code> — Run Pinpoint Ops test, deploy & status\n` +
      `• <code>@frontend</code> — Vue 3 / Inertia / Admin-Vue design laws\n` +
      `• <code>@erp_debug</code> — ERP double-entry & ledger diagnostics\n` +
      `• <code>@query_perf</code> — Query performance & index audit\n\n` +
      `🧠 <b>AI Models & Context Window:</b>\n` +
      `• <code>@claude</code> — Claude 3.5 Sonnet (200k)\n` +
      `• <code>@gemini</code> — Gemini 2.0 Flash (1M)\n` +
      `• <code>@gpt4o</code> — GPT-4o (128k)\n` +
      `• <code>@deepseek</code> — DeepSeek Chat (128k)\n\n` +
      `🤖 <b>Agents:</b>\n` +
      `• <code>@build</code> — Primary code builder\n` +
      `• <code>@plan</code> — Architecture & planning\n` +
      `• <code>@review</code> — Quality & security review\n\n` +
      `<i>💡 Tip: Prefix any prompt, e.g. <code>@frontend fix buttons</code> or <code>@plan design schema</code></i>`;

  const rows: InlineKeyboardButton[][] = [
    [
      { text: isAr ? '🧰 كل المهارات' : '🧰 All Skills', callback_data: 'mention:skills' },
      { text: isAr ? '🧠 كل الموديلات' : '🧠 All Models', callback_data: 'mention:models' },
      { text: isAr ? '🤖 كل الأيجنتس' : '🤖 All Agents', callback_data: 'mention:agents' },
    ],
    [
      { text: '🚀 @pinpoint_go', callback_data: 'mention:skill:pinpoint_go' },
      { text: '🎨 @frontend', callback_data: 'mention:skill:frontend' },
    ],
    [
      { text: '💼 @erp_debug', callback_data: 'mention:skill:erp_debug' },
      { text: '⚡ @query_perf', callback_data: 'mention:skill:query_perf' },
    ],
    [
      { text: '🧠 @claude', callback_data: 'mention:model:claude' },
      { text: '🧠 @gemini', callback_data: 'mention:model:gemini' },
      { text: '🧠 @gpt4o', callback_data: 'mention:model:gpt4o' },
    ],
    [
      { text: '🤖 @build', callback_data: 'mention:agent:build' },
      { text: '🤖 @plan', callback_data: 'mention:agent:plan' },
      { text: '🤖 @review', callback_data: 'mention:agent:review' },
    ],
    [
      {
        text: isAr ? '🔍 البحث الحي بالمنشن (@)' : '🔍 Live Mentions Search (@)',
        switch_inline_query_current_chat: '',
      },
    ],
    [
      { text: t('btn_back', language), callback_data: 'menu:home' },
    ],
  ];

  return { text: card, rows };
}

export function renderUsageReport(options: {
  dailyLimit: number;
  runTimeoutMinutes: number;
  workspaceId: string;
  platform: string;
  arch: string;
}): string {
  return `
📈 <b>Resource Usage & Quotas</b>
• Daily Limit: <b>${options.dailyLimit} tasks</b>
• Task Timeout: <b>${options.runTimeoutMinutes} minutes</b>
• Workspace ID: <code>${escapeHtml(options.workspaceId)}</code>
• Platform: <b>${options.platform} (${options.arch})</b>
`.trim();
}

export function renderHandoffReport(options: {
  targetDir: string;
  branch: string;
  dirtyLines: string[];
  commits: string[];
  currentAgent: string;
  currentMode: string;
}): string {
  const dirtyPreview = options.dirtyLines.slice(0, 10).map((l) => `  ${l}`).join('\n') || '  (Clean working tree)';
  const commitsPreview = options.commits.map((c) => `  ${c}`).join('\n') || '  (No commits)';

  return `
<b>HANDOFF — Resume task in another tool</b>
Repo: <code>${escapeHtml(options.targetDir)}</code> (Branch: <code>${escapeHtml(options.branch)}</code>)
Uncommitted files: <b>${options.dirtyLines.length}</b>
<pre><code>${escapeHtml(dirtyPreview)}</code></pre>
Last commits:
<pre><code>${escapeHtml(commitsPreview)}</code></pre>
Agent: <b>${escapeHtml(options.currentAgent)}</b> | Mode: <b>${escapeHtml(options.currentMode)}</b>
`.trim();
}
