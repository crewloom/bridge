import { registerConversationRoutes } from './conversation.js';
import { registerMenuRoutes } from './menus.js';
import { registerPermissionRoutes } from './permission.js';
import { CallbackRouter } from './router.js';
import { registerSettingsRoutes } from './settings.js';

export { CallbackRouter } from './router.js';
export type { CallbackCall, CallbackDeps, CallbackHandler } from './router.js';

/** The control room's button commands, grouped by concern. Add a button by registering it in its group. */
export function createCallbackRouter(): CallbackRouter {
  const router = new CallbackRouter();
  registerPermissionRoutes(router);
  registerMenuRoutes(router);
  registerSettingsRoutes(router);
  registerConversationRoutes(router);
  return router;
}
