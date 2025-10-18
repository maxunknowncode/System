/*
### Zweck: Handhabt die Sprachbuttons und setzt per Timeout auf Englisch zurück.
*/
import { RULES_BUTTON_ID_EN, RULES_BUTTON_ID_DE, RULES_DEFAULT_LANG, RULES_RESET_MS } from './config.js';
import { buildRulesEmbedAndComponents } from './embed.js';
import { logger } from '../../util/logging/logger.js';

const rulesLogger = logger.withPrefix('rules:interactions');

const timeouts = new Map();

export async function handleRulesButtons(interaction, client) {
  const lang = interaction.customId === RULES_BUTTON_ID_DE ? 'de' : 'en';
  const message = interaction.message;
  try {
    await interaction.update(buildRulesEmbedAndComponents(lang));
    rulesLogger.info(`Sprache → ${lang.toUpperCase()}`);
  } catch (err) {
    rulesLogger.error('Fehler beim Umschalten der Sprache:', err);
    return;
  }

  const messageId = message.id;
  if (timeouts.has(messageId)) {
    clearTimeout(timeouts.get(messageId));
  }
  const timeout = setTimeout(async () => {
    try {
      await message.edit(buildRulesEmbedAndComponents(RULES_DEFAULT_LANG));
      rulesLogger.info('Sprache → EN (Timeout)');
    } catch (err) {
      rulesLogger.error('Fehler beim Zurücksetzen der Sprache:', err);
    }
    timeouts.delete(messageId);
  }, RULES_RESET_MS);
  timeouts.set(messageId, timeout);
}
