/**
 * Type-Safe Internationalization (i18n) Module
 * Supports English (default) and Arabic out of the box.
 */

export const TRANSLATIONS = {
  en: {
    // Buttons
    btn_stop: '⏹ Stop',
    btn_diff: '📤 Diff',
    btn_status: '📊 Status',
    btn_agents: '🧠 Agents',
    btn_models: '🤖 Models',
    btn_mode: '🔒 Mode',
    btn_sessions: '📂 Sessions',
    btn_new: '✨ New',
    btn_usage: '📈 Usage',
    btn_skills: '🧰 Skills',
    btn_workspaces: '📁 Projects',
    btn_handoff: '🔁 Handoff',
    btn_help: '❓ Help',
    btn_language: '🌐 Language',

    // Permission Buttons
    perm_allow_once: '✅ Allow Once',
    perm_always_allow: '♾️ Always Allow',
    perm_reject: '⛔ Reject',
    perm_stop_session: '🛑 Stop Session',

    // Questions
    btn_done_submit: '✅ Done (Submit)',
    btn_cancel: '❌ Cancel',

    // Messages
    welcome: '⚡ <b>AgentGram Mission Control</b>\nWorkspace: <code>{target}</code>\nConnected to OpenCode. Send your prompt or tap a command below:',
    room_busy: '⚠️ <b>Agent is busy</b> — wait for it to finish or tap ⏹ Stop.',
    room_stopped: '🛑 Agent run stopped.',
    permission_prompt: '🔒 <b>Permission Required</b>\nTool: <code>{tool}</code>\nPattern: <code>{pattern}</code>\n{details}',
    permission_allowed_once: '✅ Allowed once: <code>{tool}</code>',
    permission_always_allowed: '♾️ Allowed always for this session: <code>{tool}</code>',
    permission_rejected: '⛔ Rejected: <code>{tool}</code>',
    prompt_injection_blocked: '🛡️ <b>Prompt Blocked by Security Shield</b>\nReason: <code>{reason}</code>\nConfidence: <b>{confidence}%</b>',
    policy_denied: '⛔ <b>Blocked by Security Policy</b>\nDeny rule matched: <code>{hits}</code>',
    select_agent: '🧠 <b>Select AI Agent</b> (Current: <b>{agent}</b>)',
    select_model: '🤖 <b>Select LLM Model</b> (Current: <b>{model}</b>)',
    select_mode: '🔒 <b>Execution Mode</b> (Current: <b>{mode}</b>)\nread: Refuses modifications · build: Interactive buttons · auto: Auto-approves safe commands.',
    select_workspace: '📁 <b>Projects & Workspaces</b> (Current: <b>{ws}</b>)\nSelect a project to switch or type <code>/cd &lt;path_or_name&gt;</code>:',
    ws_changed: '📁 Switched workspace to <b>{name}</b>!\nPath: <code>{ws}</code>\n🌿 Branch: <code>{branch}</code> · Modified: <code>{dirty}</code>',
    ws_not_found: '❌ Workspace path not found: <code>{path}</code>',
    ws_busy: '⚠️ A task is currently running in <code>{ws}</code>. Stop it with /stop before switching.',
    select_language: '🌐 <b>Select Language</b> (Current: <b>English</b>)',
    lang_changed: '🌐 Language switched to <b>English</b>.',
    help_title: '⚡ <b>AgentGram Commands & Shortcuts</b>',
  },
  ar: {
    // Buttons
    btn_stop: '⏹ إيقاف',
    btn_diff: '📤 الفروقات',
    btn_status: '📊 الحالة',
    btn_agents: '🧠 الوكلاء',
    btn_models: '🤖 الموديلات',
    btn_mode: '🔒 الوضع',
    btn_sessions: '📂 الجلسات',
    btn_new: '✨ جديد',
    btn_usage: '📈 الاستهلاك',
    btn_skills: '🧰 المهارات',
    btn_workspaces: '📁 المشاريع',
    btn_handoff: '🔁 تسليم',
    btn_help: '❓ مساعدة',
    btn_language: '🌐 اللغة',

    // Permission Buttons
    perm_allow_once: '✅ مرة واحدة',
    perm_always_allow: '♾️ سماح دائماً',
    perm_reject: '⛔ رفض',
    perm_stop_session: '🛑 إنهاء الجلسة',

    // Questions
    btn_done_submit: '✅ تم (إرسال الإجابة)',
    btn_cancel: '❌ إلغاء',

    // Messages
    welcome: '⚡ <b>كابينة تحكم AgentGram</b>\nمساحة العمل: <code>{target}</code>\nمتصل بـ OpenCode. أرسل مهمتك أو اختر من القائمة:',
    room_busy: '⚠️ <b>الوكيل يعمل حالياً</b> — انتظر انتهاء المهمة أو اضغط ⏹ إيقاف.',
    room_stopped: '🛑 تم إيقاف عمل الوكيل.',
    permission_prompt: '🔒 <b>طلب إذن تشغيل</b>\nالأداة: <code>{tool}</code>\nالنمط: <code>{pattern}</code>\n{details}',
    permission_allowed_once: '✅ تم السماح لمرة واحدة: <code>{tool}</code>',
    permission_always_allowed: '♾️ تم السماح دائماً لهذه الجلسة: <code>{tool}</code>',
    permission_rejected: '⛔ تم الرفض: <code>{tool}</code>',
    prompt_injection_blocked: '🛡️ <b>تم حظر الرسالة بدرع الحماية</b>\nالسبب: <code>{reason}</code>\nمستوى الثقة: <b>{confidence}%</b>',
    policy_denied: '⛔ <b>مرفوض بسياسة الأمان</b>\nتطابق مع قاعدة الحظر: <code>{hits}</code>',
    select_agent: '🧠 <b>اختر الوكيل الذكي</b> (الحالي: <b>{agent}</b>)',
    select_model: '🤖 <b>اختر موديل الذكاء الاصطناعي</b> (الحالي: <b>{model}</b>)',
    select_mode: '🔒 <b>وضع التشغيل</b> (الحالي: <b>{mode}</b>)\nread: قراءة فقط · build: أزرار موافقة تفاعلية · auto: تشغيل تلقائي آمن.',
    select_workspace: '📁 <b>المشاريع ومساحات العمل</b> (الحالي: <b>{ws}</b>)\nاضغط للتبديل لأي مشروع فوراً أو اكتب <code>/cd &lt;مسار_أو_اسم&gt;</code>:',
    ws_changed: '📁 تم تغيير مساحة العمل إلى <b>{name}</b> بنجاح!\nالمسار: <code>{ws}</code>\n🌿 الفرع: <code>{branch}</code> · الملفات المعدلة: <code>{dirty}</code>',
    ws_not_found: '❌ مسار المشروع غير موجود: <code>{path}</code>',
    ws_busy: '⚠️ يوجد مهمة تعمل حالياً في <code>{ws}</code>. يرجى إيقافها أولاً بـ /stop قبل التبديل.',
    select_language: '🌐 <b>اختر اللغة / Select Language</b> (الحالية: <b>العربية</b>)',
    lang_changed: '🌐 تم تحويل لغة الواجهة إلى <b>العربية</b>.',
    help_title: '⚡ <b>أوامر وتحكم AgentGram</b>',
  },
} as const;

export type Language = 'en' | 'ar';
export type TranslationKey = keyof typeof TRANSLATIONS.en;

export function t(key: TranslationKey, lang: Language = 'en', params?: Record<string, string | number>): string {
  const dictionary = TRANSLATIONS[lang] || TRANSLATIONS.en;
  let text: string = dictionary[key] || TRANSLATIONS.en[key] || String(key);

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }

  return text;
}
