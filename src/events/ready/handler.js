/*
### Zweck: READY-Event – loggt Anmeldung und stößt die Verify-, Regeln- und Teamlisten-Nachrichten-Prüfung an.
*/
import ensureVerifyMessage from '../../modules/verify/ensure.js';
import { ensureRulesMessage } from '../../modules/rules/ensure.js';
import { ensureTeamMessage } from '../../modules/teamlist/ensure.js';
import { startVoiceStats } from '../../modules/voiceStats/updater.js';
import { ensureTicketPanel } from '../../modules/tickets/ensure.js';
import { logger } from '../../util/logger.js';

const readyLogger = logger.withPrefix('bereit');
const verifyLogger = logger.withPrefix('verifizierung');
const rulesLogger = logger.withPrefix('regeln');
const teamLogger = logger.withPrefix('team');
const voiceStatsLogger = logger.withPrefix('voicestats');
const ticketsLogger = logger.withPrefix('tickets');

export default {
  name: 'ready',
  once: true,
  async execute(client) {
    readyLogger.info(`Angemeldet als ${client.user?.tag}`);
    try {
      await ensureVerifyMessage(client);
    } catch (err) {
      verifyLogger.error('Fehler beim Sicherstellen der Nachricht:', err);
    }
    try {
      await ensureRulesMessage(client);
    } catch (err) {
      rulesLogger.error('Fehler beim Sicherstellen der Nachricht:', err);
    }
    try {
      await ensureTeamMessage(client);
    } catch (err) {
      teamLogger.error('Fehler beim Sicherstellen der Nachricht:', err);
    }
    try {
      await startVoiceStats(client);
    } catch (err) {
      voiceStatsLogger.error('Fehler beim Starten:', err);
    }
    try {
      await ensureTicketPanel(client);
    } catch (err) {
      ticketsLogger.error('Fehler beim Sicherstellen des Panels:', err);
    }
  },
};
