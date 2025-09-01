/*
### Zweck: Stellt sicher, dass genau eine Teamlisten-Nachricht existiert.
*/
import { TEAM_CHANNEL_ID, TEAM_MESSAGE_ID, TEAM_BUTTON_ID_EN, TEAM_BUTTON_ID_DE, TEAM_ROLES } from './config.js';
import { buildTeamEmbedAndComponents } from './embed.js';
import { logger } from '../../util/logger.js';

export async function ensureTeamMessage(client) {
  let channel;
  try {
    channel = await client.channels.fetch(TEAM_CHANNEL_ID);
  } catch (err) {
    logger.error('[team] Fehler beim Sicherstellen der Nachricht:', err);
    return;
  }
  if (!channel || !channel.isTextBased()) {
    logger.warn('[team] Kanal nicht gefunden oder nicht textbasiert: ' + TEAM_CHANNEL_ID);
    return;
  }

  let payload;
  try {
    payload = await buildTeamEmbedAndComponents('en', channel.guild);
  } catch (err) {
    logger.error('[team] Fehler beim Erstellen der Embed:', err);
    return;
  }
  let message = null;

  if (TEAM_MESSAGE_ID) {
    try {
      message = await channel.messages.fetch(TEAM_MESSAGE_ID);
    } catch {
      // ignore
    }
  }

  if (!message) {
    try {
      const messages = await channel.messages.fetch({ limit: 10 });
      message = messages.find((m) =>
        m.author?.id === client.user?.id &&
        (m.embeds.some((e) => e.title === '💠 The Server Team 💠' || e.title === '💠 Das Serverteam 💠') ||
          m.components.some((row) =>
            row.components.some((c) => c.customId === TEAM_BUTTON_ID_EN || c.customId === TEAM_BUTTON_ID_DE)
          ))
      );
    } catch (err) {
      logger.error('[team] Fehler beim Sicherstellen der Nachricht:', err);
    }
  }

  const allowedMentions = { parse: [], roles: TEAM_ROLES.map(r => r.id), users: [] };

  if (message) {
    try {
      await message.edit({ ...payload, allowedMentions });
      logger.info('[team] Nachricht aktualisiert');
    } catch (err) {
      logger.error('[team] Fehler beim Sicherstellen der Nachricht:', err);
    }
  } else {
    try {
      await channel.send({ ...payload, allowedMentions });
      logger.info('[team] Nachricht erstellt');
    } catch (err) {
      logger.error('[team] Fehler beim Sicherstellen der Nachricht:', err);
    }
  }
}
