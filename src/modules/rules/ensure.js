/*
### Zweck: Stellt sicher, dass genau eine Rules-Nachricht existiert (aktualisieren oder neu senden).
*/
import { RULES_CHANNEL_ID, RULES_MESSAGE_ID, RULES_BUTTON_ID_EN, RULES_BUTTON_ID_DE, RULES_DEFAULT_LANG } from './config.js';
import { buildRulesEmbedAndComponents } from './embed.js';
import { logger } from '../../util/logger.js';

export async function ensureRulesMessage(client) {
  let channel;
  try {
    channel = await client.channels.fetch(RULES_CHANNEL_ID);
  } catch (err) {
    logger.error('[regeln] Fehler beim Sicherstellen der Nachricht:', err);
    return;
  }
  if (!channel || !channel.isTextBased()) {
    logger.warn('[regeln] Kanal nicht gefunden oder nicht textbasiert: ' + RULES_CHANNEL_ID);
    return;
  }

  const payload = buildRulesEmbedAndComponents(RULES_DEFAULT_LANG);
  let message = null;

  if (RULES_MESSAGE_ID) {
    try {
      message = await channel.messages.fetch(RULES_MESSAGE_ID);
    } catch {
      // ignore
    }
  }

  if (!message) {
    try {
      const messages = await channel.messages.fetch({ limit: 10 });
      message = messages.find((m) =>
        m.author?.id === client.user?.id &&
        m.components.some((row) =>
          row.components.some((c) => c.customId === RULES_BUTTON_ID_EN || c.customId === RULES_BUTTON_ID_DE)
        )
      );
    } catch (err) {
      logger.error('[regeln] Fehler beim Sicherstellen der Nachricht:', err);
    }
  }

  if (message) {
    try {
      await message.edit(payload);
      logger.info('[regeln] Nachricht aktualisiert');
    } catch (err) {
      logger.error('[regeln] Fehler beim Sicherstellen der Nachricht:', err);
    }
  } else {
    try {
      await channel.send(payload);
      logger.info('[regeln] Nachricht erstellt');
    } catch (err) {
      logger.error('[regeln] Fehler beim Sicherstellen der Nachricht:', err);
    }
  }
}
