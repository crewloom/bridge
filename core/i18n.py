#!/usr/bin/env python3
"""Rumuze Edit Localization (i18n) Engine.

Supports multiple languages across Telegram cards, menus, buttons, and notifications.
Default language: English ('en').
Supported languages: 'en' (English), 'ar' (Arabic).
"""

MESSAGES = {
    "en": {
        # Buttons
        "btn_agent": "🧠 Agent",
        "btn_model": "🤖 Model",
        "btn_mode": "🔒 Mode",
        "btn_sessions": "📂 Sessions",
        "btn_new": "🆕 New",
        "btn_stop": "⏹ Stop",
        "btn_status": "📊 Status",
        "btn_usage": "📈 Usage",
        "btn_diff": "📤 Diff",
        "btn_skills": "🧰 Skills",
        "btn_handoff": "🔁 Handoff",
        "btn_help": "❓ Help",
        "btn_language": "🌐 Language",
        "btn_allow_once": "✅ Allow Once",
        "btn_allow_always": "♾️ Always Allow",
        "btn_reject": "⛔ Reject",
        "btn_stop_session": "🛑 Stop Session",
        "btn_confirm": "✅ Confirm",
        "btn_custom_answer": "✍️ Custom Answer",
        "btn_skip": "⛔ Skip",
        "btn_wait": "⏳ Wait",
        "btn_end_session": "🛑 End Session",
        "btn_resume_later": "⏰ Resume After Reset",
        "btn_change_model": "🤖 Change Model",
        "btn_all_models": "➡️ All Models",
        "btn_favorites": "⭐ Favorites",
        "btn_next": "➡️ Next",
        "btn_prev": "⬅️ Previous",
        "btn_clear_skill": "❌ Clear Skill",

        # Live Card & Status
        "card_title": "⚡ Rumuze Edit · Live Mission Control",
        "status_done": "✅ Done",
        "status_thinking": "💭 Thinking…",
        "status_waiting_answer": "❓ Awaiting your answer",
        "status_waiting_approval": "🔐 Awaiting your approval",
        "card_stats": "📄 {files} files · ⌨️ {cmds} commands · ⏱ {elapsed}s",
        "ready": "🟢 Rumuze Edit Control Room is ready. Type /help",

        # Menus
        "select_agent": "🧠 <b>Select Agent</b> (Current: <b>{agent}</b>)",
        "select_model": "🤖 <b>Select Model</b> (Current: <b>{model}</b>)",
        "select_mode": "🔒 <b>Execution Mode</b> (Current: <b>{mode}</b>)\nread: Refuses file modifications · build: Interactive approval [Allow Once / Always Allow] · auto: Auto-approves safe commands, enforces security policy.",
        "active_sessions": "📂 <b>Active Sessions</b> — tap to resume",
        "active_skills": "🧰 <b>Skills</b> — select a skill then send your task",
        "select_language": "🌐 <b>Select Language</b> (Current: <b>English</b>)",
        "lang_changed": "🌐 Language switched to <b>English</b>.",

        # Permissions & Questions
        "perm_req": "🔐 <b>Permission Request</b> — {perm}\nAgent: {agent}\n<pre>{cmd}</pre>\nApproval is valid once or always for this session. Expires in 10 minutes.",
        "perm_allowed": "✅ Allowed once",
        "perm_allowed_always": "♾️ Allowed always",
        "perm_always_toast": "♾️ Always allowed for this session",
        "perm_rejected": "⛔ Rejected",
        "perm_expired": "⌛ Permission request expired — rejected.",
        "question_head": "❓ <b>Question from Agent</b> ({idx}/{total})",
        "question_footer": "<i>Answer is passed directly to agent. Auto-rejects after 10m.</i>",
        "question_expired": "⌛ Question expired — skipped.",
        "type_your_answer": "✍️ Type your answer in a single message (or tap Skip on the question).",

        # System Status & Help
        "status_title": "📊 <b>System Status</b>\n🧠 Agent: {agent}\n🤖 Model: {model}\n🔒 Mode: {mode}\n📂 Session: {session}\n⏳ Running: {busy}\n🔢 Daily Tasks: {count}/{limit}\n🌿 Branch: {branch} · Modified files: {dirty}",
        "help_title": "🛰 <b>Rumuze Edit Mission Control</b> — Send your task directly or use the buttons below:\n🧠 <b>Agents</b>: Select an active agent (e.g. build, delegate, plan).\n🤖 <b>Models</b>: Switch models on the fly.\n🔒 <b>Mode</b>: Toggle read-only diagnosis vs. build mode.\n📈 <b>Usage</b>: 24h consumption, rate limits, and scheduled tasks (/usage /queue).\n🔁 <b>Handoff</b>: Copy-pasteable context for other tools (Claude/Codex/Gemini) (/handoff).\n🌐 <b>Language</b>: Switch interface language (/lang).\nCommands: /agents /models /mode /sessions /new /stop /status /diff /skills /usage /queue /handoff /lang\n/orchestrate [task] · /plan [task] · /m provider/model [task]\nTools requiring approval will present [Allow Once / Reject] buttons.",

        # Alerts & Free Tier
        "free_tier_head": "⛔ <b>Free tier limit reached</b>\nThe provider (OpenCode Zen) rejected request: «{detail}». Free models are unavailable until reset{when}.",
        "free_tier_actions": "\n\n<b>Choose an action:</b>\n⏳ <b>Wait</b> — Keep task running and notify upon completion.\n🛑 <b>End Session</b> — Stop task and terminate session.\n⏰ <b>Resume After Reset</b> — Pause now and auto-resume after limit resets.",
        "throttle_head": "⚠️ <b>Provider temporarily throttled</b>\n«{detail}» — retrying automatically{when}.",
        "daily_limit_reached": "Daily task limit ({limit}) reached.",
        "task_queued": "➕ Queued (will run after current step finishes).",
        "stopped_by_user": "Stopped by user request",

        # Security & Prompt Injection Shield
        "prompt_injection_blocked": "🛡️ <b>Security Shield Blocked Prompt Injection</b>\n{reason}\n<i>Your request was safely rejected to preserve system boundaries.</i>",
        "policy_denied": "⛔ <b>Blocked by Security Policy</b>\nDeny rule matched: <code>{hits}</code>",
    },
    "ar": {
        # Buttons
        "btn_agent": "🧠 الأجنت",
        "btn_model": "🤖 الموديل",
        "btn_mode": "🔒 الوضع",
        "btn_sessions": "📂 الجلسات",
        "btn_new": "🆕 جديد",
        "btn_stop": "⏹ إيقاف",
        "btn_status": "📊 الحالة",
        "btn_usage": "📈 الاستهلاك",
        "btn_diff": "📤 الفروقات",
        "btn_skills": "🧰 المهارات",
        "btn_handoff": "🔁 تسليم",
        "btn_help": "❓ مساعدة",
        "btn_language": "🌐 اللغة",
        "btn_allow_once": "✅ مرة واحدة",
        "btn_allow_always": "♾️ سماح دائماً",
        "btn_reject": "⛔ رفض",
        "btn_stop_session": "🛑 إيقاف الجلسة",
        "btn_confirm": "✅ تأكيد",
        "btn_custom_answer": "✍️ إجابة مكتوبة",
        "btn_skip": "⛔ تجاهل",
        "btn_wait": "⏳ انتظر",
        "btn_end_session": "🛑 أنهِ الجلسة",
        "btn_resume_later": "⏰ نفّذ بعد التجديد",
        "btn_change_model": "🤖 غيّر الموديل",
        "btn_all_models": "➡️ كل الموديلات",
        "btn_favorites": "⭐ المفضلة",
        "btn_next": "➡️ التالي",
        "btn_prev": "⬅️ السابق",
        "btn_clear_skill": "❌ إلغاء المهارة",

        # Live Card & Status
        "card_title": "⚡ رموز إيديت · غرفة التحكم الحيّة",
        "status_done": "✅ انتهى",
        "status_thinking": "💭 يفكّر…",
        "status_waiting_answer": "❓ ينتظر إجابتك",
        "status_waiting_approval": "🔐 ينتظر موافقتك",
        "card_stats": "📄 {files} ملف · ⌨️ {cmds} أمر · ⏱ {elapsed}ث",
        "ready": "🟢 غرفة التحكم جاهزة. اكتب /help",

        # Menus
        "select_agent": "🧠 <b>اختر الأجنت</b> (الحالي: <b>{agent}</b>)",
        "select_model": "🤖 <b>اختر الموديل</b> (الحالي: <b>{model}</b>)",
        "select_mode": "🔒 <b>وضع التشغيل</b> (الحالي: <b>{mode}</b>)\nread: يرفض التعديل · build: أزرار تفاعلية [مرة واحدة / دائماً] · auto: سماح تلقائي للأوامر الآمنة مع فرض سياسة الأمان.",
        "active_sessions": "📂 <b>الجلسات النشطة</b> — اضغط للاستكمال",
        "active_skills": "🧰 <b>المهارات</b> — اختر مهارة ثم اكتب المهمة",
        "select_language": "🌐 <b>اختر اللغة / Select Language</b> (الحالية: <b>العربية</b>)",
        "lang_changed": "🌐 تم تحويل لغة الواجهة إلى <b>العربية</b>.",

        # Permissions & Questions
        "perm_req": "🔐 <b>طلب صلاحية</b> — {perm}\nالأجنت: {agent}\n<pre>{cmd}</pre>\nالموافقة لمرة واحدة أو دائماً لهذه الجلسة. تنتهي بعد 10 دقائق.",
        "perm_allowed": "✅ سُمح مرة",
        "perm_allowed_always": "♾️ سُمح دائماً",
        "perm_always_toast": "♾️ تم السماح دائماً لهذه الجلسة",
        "perm_rejected": "⛔ رُفض",
        "perm_expired": "⌛ انتهت مهلة طلب الصلاحية — رُفض.",
        "question_head": "❓ <b>سؤال من الأجنت</b> ({idx}/{total})",
        "question_footer": "<i>الإجابة تُرسل للأجنت كما هي؛ بدون رد تُرفض بعد 10 دقائق.</i>",
        "question_expired": "⌛ انتهت مهلة السؤال — رُفض.",
        "type_your_answer": "✍️ اكتب إجابتك في رسالة واحدة (أو اضغط تجاهل على السؤال).",

        # System Status & Help
        "status_title": "📊 <b>حالة النظام</b>\n🧠 الأجنت: {agent}\n🤖 الموديل: {model}\n🔒 الوضع: {mode}\n📂 الجلسة: {session}\n⏳ يعمل الآن: {busy}\n🔢 اليوم: {count}/{limit}\n🌿 الفرع: {branch} · ملفات معدلة: {dirty}",
        "help_title": "🛰 <b>غرفة تحكم رموز إيديت</b> — اكتب مهمتك مباشرة أو استخدم الأزرار التفاعلية:\n🧠 <b>الأجنت</b>: اختر الأجنت النشط (build, delegate, plan).\n🤖 <b>الموديل</b>: غيّر الموديل لحظياً.\n🔒 <b>الوضع</b>: بدّل بين التشخيص (read) وتعديل الملفات (build).\n📈 <b>الاستهلاك</b>: عداد 24 ساعة، حالة الحدود والمهام المجدولة (/usage /queue).\n🔁 <b>تسليم</b>: ملخص جاهز للنسخ لأي أداة ثانية (/handoff).\n🌐 <b>اللغة</b>: تبديل لغة الواجهة (/lang).\nالأوامر: /agents /models /mode /sessions /new /stop /status /diff /skills /usage /queue /handoff /lang\nأدوات الصلاحيات تظهر بأزرار [مرة واحدة / رفض].",

        # Alerts & Free Tier
        "free_tier_head": "⛔ <b>الحد المجاني انتهى</b>\nالمزوّد (OpenCode Zen) رفض الطلب: «{detail}». الموديل المجاني متوقف حتى موعد التجديد{when}.",
        "free_tier_actions": "\n\n<b>اختر إجراءً:</b>\n⏳ <b>انتظر</b> — ترك المهمة معلقة والإشعار عند الاستئناف.\n🛑 <b>أنهِ الجلسة</b> — إيقاف المهمة وإغلاق الجلسة.\n⏰ <b>نفّذ بعد التجديد</b> — إيقاف الآن والتشغيل تلقائياً بعد التجديد.",
        "throttle_head": "⚠️ <b>المزوّد رفض الطلب مؤقتاً</b>\n«{detail}» — إعادة المحاولة تلقائياً{when}.",
        "daily_limit_reached": "تم الوصول لحد المهام اليومي ({limit}).",
        "task_queued": "➕ أُضيفت للطابور (تُنفّذ بعد انتهاء الخطوة الحالية).",
        "stopped_by_user": "أُوقفت بطلب من المستخدم",

        # Security & Prompt Injection Shield
        "prompt_injection_blocked": "🛡️ <b>درع الحماية: تم حظر محاولة حقن البرومبت</b>\n{reason}\n<i>تم رفض الطلب لحماية حدود النظام وقواعد الأمان.</i>",
        "policy_denied": "⛔ <b>مرفوض بسياسة الأمان</b>\nتطابق مع قاعدة الحظر: <code>{hits}</code>",
    }
}


def t(key, lang="en", **kwargs):
    """Translate key for given language, with fallback to English."""
    lang = lang if lang in MESSAGES else "en"
    text = MESSAGES[lang].get(key) or MESSAGES["en"].get(key, key)
    if kwargs:
        try:
            return text.format(**kwargs)
        except Exception:
            return text
    return text
