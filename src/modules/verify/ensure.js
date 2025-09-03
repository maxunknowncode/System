/*
### Zweck: Stellt sicher, dass genau eine Verify-Nachricht existiert (aktualisieren oder neu senden).
*/
import { VERIFY_CHANNEL_ID, VERIFY_BUTTON_ID, VERIFY_DEFAULT_LANG, VERIFY_MESSAGE_ID } from './config.js';
import { buildVerifyEmbedAndComponents } from './embed.js';
import { logger } from '../../util/logger.js';

export default async function ensureVerifyMessage(client) {
  let channel;
  try {
    channel = await client.channels.fetch(VERIFY_CHANNEL_ID);
  } catch (err) {
    logger.error('[verify] Fehler beim Sicherstellen der Nachricht:', err);
    return;
  }
  if (!channel || !channel.isTextBased()) {
    logger.warn('[verify] Kanal nicht gefunden oder nicht textbasiert: ' + VERIFY_CHANNEL_ID);
    return;
  }

  const payload = buildVerifyEmbedAndComponents(VERIFY_DEFAULT_LANG);
  let message = null;

  if (VERIFY_MESSAGE_ID) {
    try {
      message = await channel.messages.fetch(VERIFY_MESSAGE_ID);
    } catch (err) {
      // Ignorieren und zum Fallback übergehen
    }
  }

  if (!message) {
    try {
      const messages = await channel.messages.fetch({ limit: 10 });
      message = messages.find((m) =>
        m.components.some((row) =>
          row.components.some((c) => c.customId === VERIFY_BUTTON_ID)
        )
      );
    } catch (err) {
      logger.error('[verify] Fehler beim Sicherstellen der Nachricht:', err);
    }
  }

  if (message) {
    try {
      await message.edit(payload);
      logger.info('[verify] Nachricht aktualisiert');
    } catch (err) {
      logger.error('[verify] Fehler beim Sicherstellen der Nachricht:', err);
    }
  } else {
    try {
      await channel.send(payload);
      logger.info('[verify] Nachricht erstellt');
    } catch (err) {
      logger.error('[verify] Fehler beim Sicherstellen der Nachricht:', err);
    }
  }
}
