import { t } from '../../i18n/index.js';
import { escapeHtml } from '../../telegram/telegram-client.js';
import { decidePermission, permissionKeyboard } from '../permissions.js';
import { say } from '../reply.js';
import type { PermissionRequest } from '../session.js';
import type { EventHandler } from './types.js';

const looksLikePermissionId = (value: unknown): boolean => Boolean(value) && String(value).startsWith('per');

/** Engines disagree on where the id lives; prefer a value shaped like `per…`, else the first one present. */
function permissionIdOf(props: Record<string, unknown>, eventId: unknown): string {
  const candidates = [props.id, props.requestID, eventId];
  const preferred = candidates.find(looksLikePermissionId);
  return String(preferred || props.id || props.requestID || eventId || '');
}

/** The engine asks to run a tool: reject, allow, or ask the owner, per policy, mode and earlier "always allow" answers. */
export const onPermissionAsked: EventHandler = async (deps, event, props) => {
  const { session, engine } = deps;
  const permissionId = permissionIdOf(props, event.id);
  const tool = String(props.permission || event.permission || 'tool');
  const metadata = (props.metadata || event.metadata || {}) as Record<string, unknown>;
  const patterns = ((props.patterns || event.patterns) as string[]) || [];
  const request: PermissionRequest = { permission: tool, metadata, patterns };

  const { decision, reason } = decidePermission(request, session.currentMode, deps.policy);

  if (decision === 'reject') {
    try {
      await engine.replyPermission(permissionId, 'reject');
    } catch {}
    if (reason) await say(deps, `⛔ ${escapeHtml(reason)}`);
    return;
  }
  if (decision === 'allow' || session.permissions.isAllowedForSession(request)) {
    await engine.replyPermission(permissionId, 'allow');
    return;
  }

  session.permissions.awaitAnswer(permissionId, request);
  const command = String(metadata.command || metadata.filepath || '');
  await say(
    deps,
    t('permission_prompt', session.currentLanguage, {
      tool: escapeHtml(tool),
      pattern: escapeHtml(String(props.patterns || '*')),
      details: command ? `<code>${escapeHtml(command.slice(0, 150))}</code>` : '',
    }),
    { replyMarkup: permissionKeyboard(permissionId, session.currentLanguage) }
  );
};
