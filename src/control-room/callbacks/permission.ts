import { pick } from '../context.js';
import { decidePermission } from '../permissions.js';
import type { CallbackCall, CallbackDeps, CallbackHandler, CallbackRouter } from './router.js';

type Decision = 'allow' | 'reject';

/** Replaces the permission prompt with its outcome and removes the buttons. */
async function settleCard(deps: CallbackDeps, call: CallbackCall, outcome: string): Promise<void> {
  if (call.messageId === undefined) return;
  const title = pick(deps.session.currentLanguage, 'طلب إذن تشغيل', 'Permission Request');
  try {
    await deps.channel.editMessage(
      deps.chatId,
      call.messageId,
      `🔒 <b>${title}</b>\n───────────────────────\n${outcome}`,
      { replyMarkup: { rows: [] } }
    );
  } catch {}
}

async function answerEngine(deps: CallbackDeps, permissionId: string, decision: Decision): Promise<void> {
  try {
    await deps.engine.replyPermission(permissionId, decision);
  } catch (err: unknown) {
    console.error('Permission reply failed:', err instanceof Error ? err.message : String(err));
  }
}

interface AllowVariant {
  remember: boolean;
  toast: [ar: string, en: string];
  outcome: [ar: string, en: string];
}

/** An allow button: re-checks the policy at answer time, so a stale or tampered prompt cannot widen access. */
function allow(variant: AllowVariant): CallbackHandler {
  return async (deps, call) => {
    const { session } = deps;
    const lang = session.currentLanguage;
    const request = session.permissions.peek(call.arg);
    if (!request || !session.isBusy) {
      await call.toast(pick(lang, 'انتهت صلاحية طلب الإذن', 'Permission request expired'));
      return;
    }
    const checked = decidePermission(request, session.currentMode, deps.policy);
    if (checked.decision === 'reject') {
      await deps.engine.replyPermission(call.arg, 'reject');
      session.permissions.resolve(call.arg);
      await call.toast(checked.reason);
      return;
    }
    if (variant.remember) session.permissions.allowForSession(request);
    session.permissions.resolve(call.arg);

    await call.toast(pick(lang, ...variant.toast));
    await settleCard(deps, call, pick(lang, ...variant.outcome));
    await answerEngine(deps, call.arg, 'allow');
  };
}

const reject: CallbackHandler = async (deps, call) => {
  const lang = deps.session.currentLanguage;
  deps.session.permissions.resolve(call.arg);
  await call.toast(pick(lang, '⛔ تم رفض الإذن', '⛔ Permission rejected'));
  await settleCard(deps, call, pick(lang, '⛔ <b>تم رفض هذا الطلب بواسطة المستخدم</b>', '⛔ <b>Rejected by user</b>'));
  await answerEngine(deps, call.arg, 'reject');
};

const stop: CallbackHandler = async (deps, call) => {
  const lang = deps.session.currentLanguage;
  await call.toast(pick(lang, '🛑 جاري إيقاف المهمة...', '🛑 Stopping task...'));
  await settleCard(
    deps,
    call,
    `🛑 <b>${pick(lang, 'تم إنهاء الجلسة بواسطة المستخدم', 'Session terminated by user')}</b>`
  );
  await deps.actions.abortCurrentRun();
};

export function registerPermissionRoutes(router: CallbackRouter): void {
  router
    .onPrefix('pm:o:', allow({
      remember: false,
      toast: ['✅ تم السماح لمرة واحدة', '✅ Allowed once'],
      outcome: ['✅ <b>تم السماح لمرة واحدة</b> • جاري المتابعة...', '✅ <b>Allowed once</b> • Continuing execution...'],
    }))
    .onPrefix('pm:a:', allow({
      remember: true,
      toast: ['♾️ تم السماح دائماً', '♾️ Always allowed'],
      outcome: ['♾️ <b>تم السماح بهذا الطلب أثناء الجلسة</b>', '♾️ <b>This request is allowed for this session</b>'],
    }))
    .onPrefix('pm:r:', reject)
    .on('stop', stop);
}
