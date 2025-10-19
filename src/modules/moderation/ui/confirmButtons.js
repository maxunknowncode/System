import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
  RESTJSONErrorCodes,
  StringSelectMenuBuilder,
} from 'discord.js';
import { coreEmbed } from '../../../util/embeds/core.js';
import { detectLangFromInteraction } from '../../../util/embeds/lang.js';
import { CUSTOM_IDS, CONFIRM_ACTION, STATUS } from '../constants.js';
import { executeAction } from '../service/exec.js';
import { getCaseById, markCaseFailed } from '../storage/repo.js';
import { logger } from '../../../util/logging/logger.js';

const uiLogger = logger.withPrefix('moderation:ui:confirm');

function encodeCustomId(actionType, caseId, decision) {
  return `${CUSTOM_IDS.CONFIRM_BUTTON}:${actionType}:${caseId}:${decision}`;
}

function parseCustomId(customId) {
  const [, actionType, caseId, decision] = customId.split(':');
  return { actionType, caseId, decision };
}

export function buildConfirmButtons(actionType, caseId, lang = 'en') {
  const language = lang === 'de' ? 'de' : 'en';
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(encodeCustomId(actionType, caseId, CONFIRM_ACTION.CONFIRM))
      .setLabel(language === 'de' ? 'Bestätigen' : 'Confirm')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(encodeCustomId(actionType, caseId, CONFIRM_ACTION.CANCEL))
      .setLabel(language === 'de' ? 'Abbrechen' : 'Cancel')
      .setStyle(ButtonStyle.Secondary)
  );
}

export function isConfirmButton(interaction) {
  return interaction.isButton() && interaction.customId.startsWith(`${CUSTOM_IDS.CONFIRM_BUTTON}:`);
}

function disableComponents(rows) {
  return rows.map((row) => {
    const builder = new ActionRowBuilder();
    for (const component of row.components) {
      if (component.type === ComponentType.Button) {
        const button = ButtonBuilder.from(component);
        builder.addComponents(button.setDisabled(true));
      } else if (component.type === ComponentType.StringSelect) {
        const select = StringSelectMenuBuilder.from(component);
        builder.addComponents(select.setDisabled(true));
      }
    }
    return builder;
  });
}

async function editReplyWithFallback(interaction, payload) {
  try {
    await interaction.editReply(payload);
  } catch (error) {
    if (error?.code === RESTJSONErrorCodes.UnknownMessage) {
      const fallback = {
        embeds: payload.embeds,
        components: [],
        flags: MessageFlags.Ephemeral,
      };
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(fallback);
      } else {
        await interaction.reply(fallback);
      }
      return;
    }
    throw error;
  }
}

export async function handleConfirmButton(interaction) {
  const lang = detectLangFromInteraction(interaction) ?? 'en';
  const { actionType, caseId, decision } = parseCustomId(interaction.customId);
  const errorMessage =
    lang === 'de'
      ? 'Etwas ist schiefgelaufen. Bitte versuche es erneut.'
      : 'Something went wrong. Please try again.';

  try {
    await interaction.deferUpdate({ flags: MessageFlags.Ephemeral });

    if (!caseId) {
      const embed = coreEmbed('ANN', lang).setDescription(lang === 'de' ? 'Fall-ID fehlt.' : 'Missing case id.');
      await editReplyWithFallback(interaction, { embeds: [embed] });
      return;
    }

    if (![CONFIRM_ACTION.CONFIRM, CONFIRM_ACTION.CANCEL].includes(decision)) {
      const embed = coreEmbed('ANN', lang).setDescription(lang === 'de' ? 'Unbekannte Aktion.' : 'Unknown action.');
      await editReplyWithFallback(interaction, { embeds: [embed] });
      return;
    }

    const caseRecord = await getCaseById(caseId);
    if (!caseRecord) {
      const embed = coreEmbed('ANN', lang).setDescription(lang === 'de' ? 'Fall nicht gefunden.' : 'Case not found.');
      await editReplyWithFallback(interaction, { embeds: [embed] });
      return;
    }

    if (caseRecord.status !== STATUS.PENDING) {
      const embed = coreEmbed('ANN', lang).setDescription(
          lang === 'de' ? 'Dieser Fall wurde bereits bearbeitet.' : 'This case has already been processed.'
        );
      await editReplyWithFallback(interaction, { embeds: [embed] });
      return;
    }

    if (decision === CONFIRM_ACTION.CANCEL) {
      await markCaseFailed(caseId);
      const disabledComponents = disableComponents(interaction.message.components ?? []);
      const embed = coreEmbed('ANN', lang).setDescription(lang === 'de' ? 'Fall verworfen.' : 'Case cancelled.');
      await editReplyWithFallback(interaction, {
        embeds: [embed],
        components: disabledComponents,
      });
      return;
    }

    const guild = interaction.guild;
    if (!guild) {
      const embed = coreEmbed('ANN', lang).setDescription(lang === 'de' ? 'Keine Guild verfügbar.' : 'Guild unavailable.');
      await editReplyWithFallback(interaction, { embeds: [embed] });
      return;
    }

    const refreshedRecord = await getCaseById(caseId);
    if (!refreshedRecord || refreshedRecord.status !== STATUS.PENDING) {
      const embed = coreEmbed('ANN', lang).setDescription(
          lang === 'de'
            ? 'Dieser Fall wurde bereits bearbeitet.'
            : 'This case has already been processed.'
        );
      await editReplyWithFallback(interaction, { embeds: [embed] });
      return;
    }

    const targetMember = await guild.members.fetch(refreshedRecord.userId).catch(() => null);
    const targetUser =
      targetMember?.user ?? (await guild.client.users.fetch(refreshedRecord.userId).catch(() => null));

    let result;
    try {
      result = await executeAction({
        interaction,
        caseId,
        actionType: actionType ?? refreshedRecord.actionType,
        guild,
        moderator: interaction.member,
        targetMember,
        targetUser,
        reasonCodes: refreshedRecord.reasonCodes ?? [],
        customReason: refreshedRecord.customReason,
        lang,
      });
    } catch (executionError) {
      uiLogger.error('Execution failed', executionError);
      const errorEmbed = coreEmbed('ANN', lang).setDescription(lang === 'de' ? 'Aktion fehlgeschlagen.' : 'Action failed.');
      const disabledComponents = disableComponents(interaction.message.components ?? []);
      await editReplyWithFallback(interaction, {
        embeds: [errorEmbed],
        components: disabledComponents,
      });
      return;
    }

    const disabledComponents = disableComponents(interaction.message.components ?? []);

    await editReplyWithFallback(interaction, {
      embeds: [result.embed],
      components: disabledComponents,
    });
  } catch (error) {
    uiLogger.error('Failed to handle confirm interaction', error);

    if (!interaction.deferred && !interaction.replied) {
      try {
        await interaction.deferUpdate({ flags: MessageFlags.Ephemeral });
      } catch (deferError) {
        uiLogger.error('Failed to defer confirm interaction', deferError);
      }
    }

    const failureEmbed = coreEmbed('ANN', lang).setDescription(errorMessage);

    await editReplyWithFallback(interaction, {
      embeds: [failureEmbed],
      components: disableComponents(interaction.message?.components ?? []),
    });
  }
}

export { encodeCustomId as buildConfirmCustomId };
