/*
### Zweck: Stellt sicher, dass genau eine Verify-Nachricht existiert (aktualisieren oder neu senden).
*/
import { VERIFY_CHANNEL_ID, VERIFY_BUTTON_ID, VERIFY_DEFAULT_LANG, VERIFY_MESSAGE_ID } from './config.js';
import { buildVerifyEmbedAndComponents } from './embed.js';
import { logger } from '../../util/logging/logger.js';

const verifyLogger = logger.withPrefix('verify:ensure');

export default async function ensureVerifyMessage(client) {
  let channel;
  try {
    channel = await client.channels.fetch(VERIFY_CHANNEL_ID);
  } catch (err) {
    verifyLogger.error('Fehler beim Sicherstellen der Nachricht:', err);
    return;
  }
  if (!channel || !channel.isTextBased()) {
    verifyLogger.warn('Kanal nicht gefunden oder nicht textbasiert: ' + VERIFY_CHANNEL_ID);
    return;
  }

  const payload = {
    ...buildVerifyEmbedAndComponents(VERIFY_DEFAULT_LANG),
    allowedMentions: { parse: [] },
  };
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
      verifyLogger.error('Fehler beim Sicherstellen der Nachricht:', err);
    }
  }

  if (message) {
    try {
      await message.edit(payload);
      verifyLogger.info('Nachricht aktualisiert');
    } catch (err) {
      verifyLogger.error('Fehler beim Sicherstellen der Nachricht:', err);
    }
  } else {
    try {
      await channel.send(payload);
      verifyLogger.info('Nachricht erstellt');
    } catch (err) {
      verifyLogger.error('Fehler beim Sicherstellen der Nachricht:', err);
    }
  }
}
