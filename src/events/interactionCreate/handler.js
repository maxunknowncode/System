import { randomUUID } from 'node:crypto';
import { MessageFlags, RESTJSONErrorCodes } from 'discord.js';
/*
### Zweck: Handhabt Regeln-, Verify- und Teamlisten-Buttons sowie Chat-Input-Commands.
*/
import { VERIFY_BUTTON_ID, VERIFY_LANG_EN_ID, VERIFY_LANG_DE_ID } from '../../modules/verify/config.js';
import { handleVerifyInteractions } from '../../modules/verify/interactions.js';
import { RULES_BUTTON_ID_EN, RULES_BUTTON_ID_DE } from '../../modules/rules/config.js';
import { handleRulesButtons } from '../../modules/rules/interactions.js';
import { TEAM_BUTTON_ID_EN, TEAM_BUTTON_ID_DE } from '../../modules/teamlist/config.js';
import { handleTeamButtons } from '../../modules/teamlist/interactions.js';
import { logger } from '../../util/logging/logger.js';
import { isDurationSelect, handleDurationSelect } from '../../modules/moderation/ui/durationSelect.js';
import { isReasonsSelect, handleReasonsSelect } from '../../modules/moderation/ui/reasonsSelect.js';
import { isCustomReasonModal, handleCustomReasonModal } from '../../modules/moderation/ui/customReasonModal.js';
import { isConfirmButton, handleConfirmButton } from '../../modules/moderation/ui/confirmButtons.js';
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
import { coreEmbed } from '../../util/embeds/core.js';
import { detectLangFromInteraction } from '../../util/embeds/lang.js';
import { GENERIC_MESSAGES, resolveText } from '../../i18n/messages.js';

const commandLogger = logger.withPrefix('commands:execute');
const interactionLogger = logger.withPrefix('interactions:router');

const createErrorId = () => {
  try {
    return randomUUID();
  } catch {
    return Math.random().toString(36).slice(2, 10);
  }
};

async function sendGenericError(interaction, errorId) {
  const lang = detectLangFromInteraction(interaction) ?? 'en';
  const embed = coreEmbed('ANN', lang)
    .setColor(0xff4d4d)
    .setTitle(resolveText(GENERIC_MESSAGES.genericErrorTitle, lang))
    .setDescription(resolveText(GENERIC_MESSAGES.errorWithReference, lang, { errorId }));

  try {
    if (interaction.isRepliable()) {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      }
    } else if (typeof interaction.followUp === 'function') {
      await interaction.followUp({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  } catch (err) {
    if (err?.code !== RESTJSONErrorCodes.UnknownMessage && err?.code !== RESTJSONErrorCodes.UnknownInteraction) {
      interactionLogger.warn(`Failed to send generic error response (${errorId})`, err);
    }
  }
}

async function handleCommand(interaction, client) {
  const command = client.commands?.get(interaction.commandName);
  if (!command) {
    const lang = detectLangFromInteraction(interaction) ?? 'en';
    const embed = coreEmbed('ANN', lang)
      .setColor(0xff4d4d)
      .setDescription(resolveText(GENERIC_MESSAGES.unknownCommand, lang));
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
    return;
  }

  await command.execute(interaction, client);
}

async function handleStringSelect(interaction, client) {
  if (interaction.customId === MENU_CUSTOM_ID) {
    await handleTicketInteractions(interaction, client);
    return;
  }
  if (isDurationSelect(interaction)) {
    await handleDurationSelect(interaction);
    return;
  }
  if (isReasonsSelect(interaction)) {
    await handleReasonsSelect(interaction);
    return;
  }
}

async function handleButton(interaction, client) {
  if (isConfirmButton(interaction)) {
    await handleConfirmButton(interaction);
    return;
  }

  if (
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
  }
}

async function handleModal(interaction) {
  if (isCustomReasonModal(interaction)) {
    await handleCustomReasonModal(interaction);
  }
}

export default {
  name: 'interactionCreate',
  once: false,
  async execute(interaction, client) {
    if (interaction.isChatInputCommand()) {
      try {
        await handleCommand(interaction, client);
      } catch (error) {
        const errorId = createErrorId();
        commandLogger.error(`Ausführung fehlgeschlagen (${errorId}):`, error);
        await sendGenericError(interaction, errorId);
      }
      return;
    }

    if (interaction.isStringSelectMenu()) {
      try {
        await handleStringSelect(interaction, client);
      } catch (error) {
        const errorId = createErrorId();
        interactionLogger.error(`String select handler failed (${errorId})`, error);
        await sendGenericError(interaction, errorId);
      }
      return;
    }

    if (interaction.isModalSubmit()) {
      try {
        await handleModal(interaction);
      } catch (error) {
        const errorId = createErrorId();
        interactionLogger.error(`Modal handler failed (${errorId})`, error);
        await sendGenericError(interaction, errorId);
      }
      return;
    }

    if (interaction.isButton()) {
      try {
        await handleButton(interaction, client);
      } catch (error) {
        const errorId = createErrorId();
        interactionLogger.error(`Button handler failed (${errorId})`, error);
        await sendGenericError(interaction, errorId);
      }
    }
  },
};
