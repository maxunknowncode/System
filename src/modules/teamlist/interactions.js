/*
### Zweck: Handhabt Sprachwechsel-Buttons der Teamliste und Timeout-Rücksetzung.
*/
import {
  TEAM_BUTTON_ID_EN,
  TEAM_BUTTON_ID_DE,
  TEAM_RESET_MS,
  TEAM_ROLES,
  TEAM_ROLES_ORDER,
} from './config.js';
import { buildTeamEmbedAndComponents } from './embed.js';
import { logger } from '../../util/logging/logger.js';

const teamLogger = logger.withPrefix('team:interactions');

const timeouts = new Map();

export async function handleTeamButtons(interaction, client) {
  const allowedMentions = {
    parse: [],
    roles: TEAM_ROLES_ORDER.map((key) => TEAM_ROLES[key]?.id).filter(Boolean),
    users: [],
  };
  const lang = interaction.customId === TEAM_BUTTON_ID_DE ? 'de' : 'en';
  try {
    await interaction.update({ ...(await buildTeamEmbedAndComponents(lang, interaction.guild)), allowedMentions });
    teamLogger.info(`Sprache → ${lang.toUpperCase()}`);
  } catch (err) {
    teamLogger.error('Fehler beim Umschalten der Sprache:', err);
    return;
  }

  const messageId = interaction.message.id;
  if (timeouts.has(messageId)) {
    clearTimeout(timeouts.get(messageId));
  }
  const timeout = setTimeout(async () => {
    try {
      const payload = await buildTeamEmbedAndComponents('en', interaction.guild);
      await interaction.message.edit({ ...payload, allowedMentions });
      teamLogger.info('Sprache → EN (Timeout)');
    } catch (err) {
      teamLogger.error('Fehler beim Zurücksetzen der Sprache:', err);
    }
    timeouts.delete(messageId);
  }, TEAM_RESET_MS);
  timeouts.set(messageId, timeout);
}
