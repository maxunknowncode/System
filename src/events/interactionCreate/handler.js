/*
### Zweck: Handhabt Regeln-, Verify- und Teamlisten-Buttons sowie Chat-Input-Commands.
*/
import { VERIFY_BUTTON_ID, VERIFY_LANG_EN_ID, VERIFY_LANG_DE_ID } from '../../modules/verify/config.js';
import { handleVerifyInteractions } from '../../modules/verify/interactions.js';
import { RULES_BUTTON_ID_EN, RULES_BUTTON_ID_DE } from '../../modules/rules/config.js';
import { handleRulesButtons } from '../../modules/rules/interactions.js';
import { TEAM_BUTTON_ID_EN, TEAM_BUTTON_ID_DE } from '../../modules/teamlist/config.js';
import { handleTeamButtons } from '../../modules/teamlist/interactions.js';
import { logger } from '../../util/logger.js';
import {
  MENU_CUSTOM_ID,
  BTN_CLAIM_ID,
  BTN_CLOSE_ID,
  BTN_CLOSE_CONFIRM_ID,
  BTN_REOPEN_ID,
  BTN_REOPEN_CONFIRM_ID,
  BTN_DELETE_ID,
  BTN_DELETE_CONFIRM_ID,
} from '../../modules/tickets/config.js';
import { handleTicketInteractions } from '../../modules/tickets/interactions.js';

export default {
  name: 'interactionCreate',
  once: false,
  async execute(interaction, client) {
    if (interaction.isStringSelectMenu() && interaction.customId === MENU_CUSTOM_ID) {
      await handleTicketInteractions(interaction, client);
      return;
    }
    if (
      interaction.isButton() &&
      [
        BTN_CLAIM_ID,
        BTN_CLOSE_ID,
        BTN_CLOSE_CONFIRM_ID,
        BTN_REOPEN_ID,
        BTN_REOPEN_CONFIRM_ID,
        BTN_DELETE_ID,
        BTN_DELETE_CONFIRM_ID,
      ].includes(interaction.customId)
    ) {
      await handleTicketInteractions(interaction, client);
      return;
    }
    if (interaction.isButton()) {
      if (
        interaction.customId === VERIFY_BUTTON_ID ||
        interaction.customId === VERIFY_LANG_EN_ID ||
        interaction.customId === VERIFY_LANG_DE_ID
      ) {
        await handleVerifyInteractions(interaction, client);
        return;
      }
      if (interaction.customId === TEAM_BUTTON_ID_EN || interaction.customId === TEAM_BUTTON_ID_DE) {
        await handleTeamButtons(interaction, client);
        return;
      }
      if (interaction.customId === RULES_BUTTON_ID_EN || interaction.customId === RULES_BUTTON_ID_DE) {
        await handleRulesButtons(interaction, client);
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
      } catch (err) {
        logger.warn('[befehle] Antwort senden fehlgeschlagen:', err);
      }
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
      } catch (err) {
        logger.warn('[befehle] Antwort senden fehlgeschlagen:', err);
      }
    }
  },
};
