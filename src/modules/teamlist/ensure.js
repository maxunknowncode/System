/*
### Zweck: Stellt sicher, dass genau eine Teamlisten-Nachricht existiert.
*/
import { TEAM_CHANNEL_ID, TEAM_MESSAGE_ID, TEAM_BUTTON_ID_EN, TEAM_BUTTON_ID_DE, TEAM_ROLES } from './config.js';
import { buildTeamEmbedAndComponents, TEAM_TITLES } from './embed.js';
import { logger } from '../../util/logger.js';

const teamLogger = logger.withPrefix('team');
const FALLBACK_EMBED_TITLES = new Set([
  ...Object.values(TEAM_TITLES),
  '💠 The Server Team 💠',
  '💠 Das Serverteam 💠',
]);

export async function ensureTeamMessage(client) {
  let channel;
  try {
    channel = await client.channels.fetch(TEAM_CHANNEL_ID);
  } catch (err) {
    teamLogger.error('Fehler beim Sicherstellen der Nachricht:', err);
    return;
  }
  if (!channel || !channel.isTextBased()) {
    teamLogger.warn('Kanal nicht gefunden oder nicht textbasiert: ' + TEAM_CHANNEL_ID);
    return;
  }

  const allowedMentions = { parse: [], roles: TEAM_ROLES.map(r => r.id) };

  let message = null;
  try {
    message = await channel.messages.fetch(TEAM_MESSAGE_ID);
  } catch (err) {
    teamLogger.error('Nachricht konnte nicht abgerufen werden:', err);
  }

  if (message) {
    try {
      const { embeds, components } = await buildTeamEmbedAndComponents('en', channel.guild);
      await message.edit({ embeds, components, allowedMentions });
      teamLogger.info('Nachricht aktualisiert');
    } catch (err) {
      teamLogger.error('Fehler beim Sicherstellen der Nachricht:', err);
    }
    return;
  }

  try {
    const messages = await channel.messages.fetch({ limit: 10 });
    message = messages.find((m) =>
      m.author?.id === client.user?.id &&
      (m.embeds.some((e) => e?.title && FALLBACK_EMBED_TITLES.has(e.title)) ||
        m.components.some((row) =>
          row.components.some((c) => c.customId === TEAM_BUTTON_ID_EN || c.customId === TEAM_BUTTON_ID_DE)
        ))
    );
  } catch (err) {
    teamLogger.error('Fehler beim Sicherstellen der Nachricht:', err);
  }

  try {
    const { embeds, components } = await buildTeamEmbedAndComponents('en', channel.guild);
    if (message) {
      await message.edit({ embeds, components, allowedMentions });
      teamLogger.info('Nachricht aktualisiert');
    } else {
      await channel.send({ embeds, components, allowedMentions });
      teamLogger.info('Nachricht erstellt');
    }
  } catch (err) {
    teamLogger.error('Fehler beim Sicherstellen der Nachricht:', err);
  }
}
