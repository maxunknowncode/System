/*
### Zweck: READY-Event – loggt Anmeldung und stößt die Verify-, Regeln- und Teamlisten-Nachrichten-Prüfung an.
*/
import ensureVerifyMessage from '../../modules/verify/ensure.js';
import { ensureRulesMessage } from '../../modules/rules/ensure.js';
import { ensureTeamMessage } from '../../modules/teamlist/ensure.js';
import { startVoiceStats } from '../../modules/voiceStats/updater.js';
import { ensureTicketPanel } from '../../modules/tickets/ensure.js';
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
    try {
      await ensureTeamMessage(client);
    } catch (err) {
      logger.error('[team] Fehler beim Sicherstellen der Nachricht:', err);
    }
    try {
      await startVoiceStats(client);
    } catch (err) {
      logger.error('[voicestats] Fehler beim Starten:', err);
    }
    try {
      await ensureTicketPanel(client);
    } catch {}
  },
};
