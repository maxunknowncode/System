/*
### Zweck: Handhabt Regeln- und Verify-Buttons sowie Chat-Input-Commands.
*/
import { VERIFY_BUTTON_ID } from '../../modules/verify/config.js';
import { handleVerifyButton } from '../../modules/verify/interactions.js';
import { RULES_BUTTON_ID_EN, RULES_BUTTON_ID_DE } from '../../modules/rules/config.js';
import { handleRulesButtons } from '../../modules/rules/interactions.js';
import { logger } from '../../util/logger.js';

export default {
  name: 'interactionCreate',
  once: false,
  async execute(interaction, client) {
    if (interaction.isButton()) {
      if (interaction.customId === RULES_BUTTON_ID_EN || interaction.customId === RULES_BUTTON_ID_DE) {
        await handleRulesButtons(interaction, client);
        return;
      }
      if (interaction.customId === VERIFY_BUTTON_ID) {
        await handleVerifyButton(interaction, client);
        return;
      }
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands?.get(interaction.commandName);
    if (!command) {
      const payload = { content: 'Unknown command.' };
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(payload);
        } else {
          await interaction.reply({ ...payload, ephemeral: true });
        }
      } catch {}
      return;
    }

    try {
      if (typeof command.execute === 'function') {
        await command.execute(interaction, client);
      }
    } catch (error) {
      logger.error('[befehle] Ausführung fehlgeschlagen:', error);
      const payload = { content: 'An error occurred while executing this command.' };
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(payload);
        } else {
          await interaction.reply({ ...payload, ephemeral: true });
        }
      } catch {}
    }
  },
};
