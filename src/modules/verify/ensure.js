/*
### Zweck: Stellt sicher, dass genau eine Verify-Nachricht existiert (aktualisieren oder neu senden).
*/
import { VERIFY_CHANNEL_ID, VERIFY_MESSAGE_ID, VERIFY_BUTTON_ID } from './config.js';
import { buildVerifyEmbedAndComponents } from './embed.js';
import { logger } from '../../util/logger.js';

export default async function ensureVerifyMessage(client) {
  let channel;
  try {
    channel = await client.channels.fetch(VERIFY_CHANNEL_ID);
  } catch (err) {
    logger.error('[verifizierung] Fehler beim Sicherstellen der Nachricht:', err);
    return;
  }
  if (!channel || !channel.isTextBased()) {
    logger.warn('[verifizierung] Kanal nicht gefunden oder nicht textbasiert: ' + VERIFY_CHANNEL_ID);
    return;
  }

  const payload = buildVerifyEmbedAndComponents();
  let message = null;

    if (VERIFY_MESSAGE_ID) {
      try {
        message = await channel.messages.fetch(VERIFY_MESSAGE_ID);
      } catch {
        // ignore
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
        logger.error('[verifizierung] Fehler beim Sicherstellen der Nachricht:', err);
      }
    }

    if (message) {
      try {
        await message.edit(payload);
        logger.info('[verifizierung] Nachricht aktualisiert');
      } catch (err) {
        logger.error('[verifizierung] Fehler beim Sicherstellen der Nachricht:', err);
      }
    } else {
      try {
        await channel.send(payload);
        logger.info('[verifizierung] Nachricht erstellt');
      } catch (err) {
        logger.error('[verifizierung] Fehler beim Sicherstellen der Nachricht:', err);
      }
    }
}
