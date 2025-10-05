import {
  ActionRowBuilder,
  MessageFlags,
  RESTJSONErrorCodes,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { coreEmbed } from '../../../util/embeds/core.js';
import { detectLangFromInteraction } from '../../../util/embeds/lang.js';
import { REASON_CODES, REASON_LABELS } from '../config.js';
import { CUSTOM_IDS, ERROR_COLOR, SUCCESS_COLOR, STATUS } from '../constants.js';
import { getCaseById } from '../storage/repo.js';
import { setPendingReasons, setPendingCustomReason } from '../service/exec.js';
import { buildCustomReasonModal } from './customReasonModal.js';
import { logger } from '../../../util/logging/logger.js';

const uiLogger = logger.withPrefix('moderation:ui:reasons');

function encodeCustomId(caseId) {
  return `${CUSTOM_IDS.REASON_SELECT}:${caseId}`;
}

function parseCustomId(customId) {
  const [, caseId] = customId.split(':');
  return caseId;
}

export function buildReasonsSelect(caseId, lang = 'en', selectedCodes = [], includeCustom = false) {
  const language = lang === 'de' ? 'de' : 'en';
  const selectedSet = new Set(selectedCodes ?? []);
  if (includeCustom) {
    selectedSet.add('CUSTOM');
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId(encodeCustomId(caseId))
    .setPlaceholder(language === 'de' ? 'Gründe auswählen' : 'Select reasons')
    .setMinValues(1)
    .setMaxValues(5);

  for (const code of REASON_CODES) {
    const label = REASON_LABELS[language][code] ?? code;
    const option = new StringSelectMenuOptionBuilder()
      .setLabel(label)
      .setValue(code)
      .setDefault(selectedSet.has(code));
    select.addOptions(option);
  }

  return new ActionRowBuilder().addComponents(select);
}

export function isReasonsSelect(interaction) {
  return interaction.isStringSelectMenu() && interaction.customId.startsWith(`${CUSTOM_IDS.REASON_SELECT}:`);
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

export async function handleReasonsSelect(interaction) {
  const lang = detectLangFromInteraction(interaction) ?? 'en';
  const caseId = parseCustomId(interaction.customId);
  const embed = coreEmbed('ANN', lang);
  const errorMessage =
    lang === 'de'
      ? 'Etwas ist schiefgelaufen. Bitte versuche es erneut.'
      : 'Something went wrong. Please try again.';

  try {
    if (!caseId) {
      embed
        .setColor(ERROR_COLOR)
        .setDescription(lang === 'de' ? 'Der Fall fehlt.' : 'Missing case identifier.');
      await interaction.deferUpdate({ flags: MessageFlags.Ephemeral });
      await editReplyWithFallback(interaction, {
        embeds: [embed],
        components: interaction.message?.components ?? [],
      });
      return;
    }

    const caseRecord = await getCaseById(caseId);
    if (!caseRecord) {
      embed
        .setColor(ERROR_COLOR)
        .setDescription(lang === 'de' ? 'Fall nicht gefunden.' : 'Case not found.');
      await interaction.deferUpdate({ flags: MessageFlags.Ephemeral });
      await editReplyWithFallback(interaction, {
        embeds: [embed],
        components: interaction.message?.components ?? [],
      });
      return;
    }

    if (caseRecord.status !== STATUS.PENDING) {
      embed
        .setColor(ERROR_COLOR)
        .setDescription(
          lang === 'de'
            ? 'Dieser Fall wurde bereits bearbeitet.'
            : 'This case has already been processed.'
        );
      await interaction.deferUpdate({ flags: MessageFlags.Ephemeral });
      await editReplyWithFallback(interaction, {
        embeds: [embed],
        components: interaction.message?.components ?? [],
      });
      return;
    }

    const rawValues = interaction.values ?? [];
    const uniqueValues = Array.from(new Set(rawValues));

    if (!uniqueValues.length) {
      embed
        .setColor(ERROR_COLOR)
        .setDescription(
          lang === 'de' ? 'Bitte wähle mindestens einen Grund.' : 'Please select at least one reason.'
        );
      await interaction.deferUpdate({ flags: MessageFlags.Ephemeral });
      await editReplyWithFallback(interaction, {
        embeds: [embed],
        components: interaction.message?.components ?? [],
      });
      return;
    }

    if (uniqueValues.length > 5) {
      embed
        .setColor(ERROR_COLOR)
        .setDescription(
          lang === 'de' ? 'Maximal 5 Gründe möglich.' : 'You can choose at most 5 reasons.'
        );
      await interaction.deferUpdate({ flags: MessageFlags.Ephemeral });
      await editReplyWithFallback(interaction, {
        embeds: [embed],
        components: interaction.message?.components ?? [],
      });
      return;
    }

    const needsCustom = uniqueValues.includes('CUSTOM');
    const filtered = uniqueValues.filter((code) => code !== 'CUSTOM');

    await setPendingReasons(caseId, filtered, lang);
    await setPendingCustomReason(caseId, null, lang);

    const updated = await getCaseById(caseId);
    const newReasonRow = buildReasonsSelect(
      caseId,
      lang,
      updated?.reasonCodes ?? filtered,
      Boolean(updated?.customReason)
    );
    const updatedComponents = replaceReasonRow(interaction.message?.components ?? [], newReasonRow);

    if (needsCustom) {
      const modal = buildCustomReasonModal(caseId, lang);
      await interaction.showModal(modal);

      const currentEmbeds = interaction.message?.embeds?.length
        ? interaction.message.embeds
        : [embed];
      await editReplyWithFallback(interaction, {
        embeds: currentEmbeds,
        components: updatedComponents,
      });
      return;
    }

    await interaction.deferUpdate({ flags: MessageFlags.Ephemeral });

    const language = lang === 'de' ? 'de' : 'en';
    const labelMap = REASON_LABELS[language] ?? {};
    embed
      .setColor(SUCCESS_COLOR)
      .setDescription(
        language === 'de'
          ? `Gründe gespeichert: ${filtered.map((code) => labelMap[code] ?? code).join(', ')}`
          : `Reasons saved: ${filtered.map((code) => labelMap[code] ?? code).join(', ')}`
      );

    await editReplyWithFallback(interaction, {
      embeds: [embed],
      components: updatedComponents,
    });
  } catch (error) {
    uiLogger.error('Failed to handle reasons select', error);

    if (!interaction.deferred && !interaction.replied) {
      try {
        await interaction.deferUpdate({ flags: MessageFlags.Ephemeral });
      } catch (deferError) {
        uiLogger.error('Failed to defer interaction for reasons select', deferError);
      }
    }

    const failureEmbed = coreEmbed('ANN', lang)
      .setColor(ERROR_COLOR)
      .setDescription(errorMessage);

    await editReplyWithFallback(interaction, {
      embeds: [failureEmbed],
      components: interaction.message?.components ?? [],
    });
  }
}

export { encodeCustomId as buildReasonCustomId };
