/*
### Zweck: Handhabt Sprachwechsel-Buttons der Teamliste und Timeout-Rücksetzung.
*/
import { TEAM_BUTTON_ID_EN, TEAM_BUTTON_ID_DE, TEAM_RESET_MS } from './config.js';
import { buildTeamEmbedAndComponents } from './embed.js';
import { logger } from '../../util/logger.js';

const timeouts = new Map();

export async function handleTeamButtons(interaction, client) {
  const lang = interaction.customId === TEAM_BUTTON_ID_DE ? 'de' : 'en';
  try {
    await interaction.update(await buildTeamEmbedAndComponents(lang, interaction.guild));
    logger.info(`[team] Sprache → ${lang.toUpperCase()}`);
  } catch (err) {
    logger.error('[team] Fehler beim Umschalten der Sprache:', err);
    return;
  }

  const messageId = interaction.message.id;
  if (timeouts.has(messageId)) {
    clearTimeout(timeouts.get(messageId));
  }
  const timeout = setTimeout(async () => {
    try {
      const payload = await buildTeamEmbedAndComponents('en', interaction.guild);
      await interaction.message.edit(payload);
      logger.info('[team] Sprache → EN (Timeout)');
    } catch (err) {
      logger.error('[team] Fehler beim Zurücksetzen der Sprache:', err);
    }
    timeouts.delete(messageId);
  }, TEAM_RESET_MS);
  timeouts.set(messageId, timeout);
}
