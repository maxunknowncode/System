import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags,
  RESTJSONErrorCodes,
} from 'discord.js';
import { coreEmbed } from '../../../util/embeds/core.js';
import { detectLangFromInteraction } from '../../../util/embeds/lang.js';
import { CUSTOM_IDS, STATUS } from '../constants.js';
import { setPendingCustomReason } from '../service/exec.js';
import { getCaseById } from '../storage/repo.js';
import { buildReasonsSelect } from './reasonsSelect.js';
import { logger } from '../../../util/logging/logger.js';

const uiLogger = logger.withPrefix('moderation:ui:custom-reason');

const INPUT_ID = 'custom_reason_text';

function encodeCustomId(caseId) {
  return `${CUSTOM_IDS.REASON_MODAL}:${caseId}`;
}

function parseCustomId(customId) {
  const [, caseId] = customId.split(':');
  return caseId;
}

export function buildCustomReasonModal(caseId, lang = 'en') {
  const language = lang === 'de' ? 'de' : 'en';
  return new ModalBuilder()
    .setCustomId(encodeCustomId(caseId))
    .setTitle(language === 'de' ? 'Eigener Grund' : 'Custom reason')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(INPUT_ID)
          .setLabel(language === 'de' ? 'Bitte beschreibe den Grund' : 'Describe the reason')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(512)
      )
    );
}

export function isCustomReasonModal(interaction) {
  return interaction.isModalSubmit() && interaction.customId.startsWith(`${CUSTOM_IDS.REASON_MODAL}:`);
}

function replaceReasonRow(rows, newReasonRow) {
  if (!rows?.length) {
    return [newReasonRow];
  }

  let replaced = false;
  const mapped = rows.map((row) => {
    const isReasonRow = row.components?.some((component) =>
      component.customId?.startsWith(`${CUSTOM_IDS.REASON_SELECT}:`)
    );
    if (isReasonRow) {
      replaced = true;
      return newReasonRow;
    }
    return ActionRowBuilder.from(row);
  });

  if (!replaced) {
    mapped.push(newReasonRow);
  }

  return mapped;
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

export async function handleCustomReasonModal(interaction) {
  const lang = detectLangFromInteraction(interaction) ?? 'en';
  const caseId = parseCustomId(interaction.customId);
  const embed = coreEmbed('ANN', lang);
  const errorMessage =
    lang === 'de'
      ? 'Etwas ist schiefgelaufen. Bitte versuche es erneut.'
      : 'Something went wrong. Please try again.';

  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!caseId) {
      embed.setDescription(lang === 'de' ? 'Fall-ID fehlt.' : 'Missing case id.');
      await editReplyWithFallback(interaction, { embeds: [embed] });
      return;
    }

    const caseRecord = await getCaseById(caseId);
    if (!caseRecord || caseRecord.status !== STATUS.PENDING) {
      embed.setDescription(
          lang === 'de'
            ? 'Dieser Fall wurde bereits bearbeitet.'
            : 'This case has already been processed.'
        );
      await editReplyWithFallback(interaction, { embeds: [embed] });
      return;
    }

    const rawValue = interaction.fields.getTextInputValue(INPUT_ID);
    const value = typeof rawValue === 'string' ? rawValue.trim() : '';
    if (!value) {
      embed.setDescription(lang === 'de' ? 'Bitte gib einen Grund ein.' : 'Please provide a reason.');
      await editReplyWithFallback(interaction, { embeds: [embed] });
      return;
    }

    const limited = value.slice(0, 300);
    await setPendingCustomReason(caseId, limited, lang);

    const updated = await getCaseById(caseId);
    const newReasonRow = buildReasonsSelect(
      caseId,
      lang,
      updated?.reasonCodes ?? caseRecord.reasonCodes ?? [],
      Boolean(updated?.customReason)
    );
    const baseComponents = interaction.message?.components ?? [];
    const updatedComponents = baseComponents.length
      ? replaceReasonRow(baseComponents, newReasonRow)
      : baseComponents;

    embed.setDescription(lang === 'de' ? 'Eigener Grund gespeichert.' : 'Custom reason saved.');

    await editReplyWithFallback(interaction, {
      embeds: [embed],
      components: updatedComponents,
    });
  } catch (error) {
    uiLogger.error('Failed to handle custom reason modal', error);

    if (!interaction.deferred && !interaction.replied) {
      try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      } catch (deferError) {
        uiLogger.error('Failed to defer modal interaction', deferError);
      }
    }

    const failureEmbed = coreEmbed('ANN', lang).setDescription(errorMessage);

    await editReplyWithFallback(interaction, { embeds: [failureEmbed] });
  }
}

export { encodeCustomId as buildCustomReasonCustomId };
