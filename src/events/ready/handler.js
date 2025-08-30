/*
### Zweck: READY-Event – loggt Anmeldung und stößt die Verify- und Regelnachrichten-Prüfung an.
*/
import ensureVerifyMessage from '../../modules/verify/ensure.js';
import { ensureRulesMessage } from '../../modules/rules/ensure.js';
import { logger } from '../../util/logger.js';

export default {
  name: 'ready',
  once: true,
  async execute(client) {
    logger.info(`[bereit] Angemeldet als ${client.user?.tag}`);
    try {
      await ensureVerifyMessage(client);
    } catch (err) {
      logger.error('[verifizierung] Fehler beim Sicherstellen der Nachricht:', err);
    }
    try {
      await ensureRulesMessage(client);
    } catch (err) {
      logger.error('[regeln] Fehler beim Sicherstellen der Nachricht:', err);
    }
  },
};
