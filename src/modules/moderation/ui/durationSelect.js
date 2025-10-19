import {
  ActionRowBuilder,
  MessageFlags,
  RESTJSONErrorCodes,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { coreEmbed } from '../../../util/embeds/core.js';
import { detectLangFromInteraction } from '../../../util/embeds/lang.js';
import { BAN_PRESETS, TIMEOUT_PRESETS } from '../config.js';
import { ACTION, CUSTOM_IDS } from '../constants.js';
import { getCaseById, updateCaseDuration } from '../storage/repo.js';
import { logger } from '../../../util/logging/logger.js';

const uiLogger = logger.withPrefix('moderation:ui:duration');

const DURATION_MAP = {
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

function encodeCustomId(actionType, caseId) {
  return `${CUSTOM_IDS.DURATION_SELECT}:${actionType}:${caseId}`;
}

function parseCustomId(customId) {
  const [, actionType, caseId] = customId.split(':');
  return { actionType, caseId };
}

function presetToMs(value) {
  if (!value) return null;
  if (value === 'permanent') return null;
  const match = /^([0-9]+)([mhd])$/.exec(value);
  if (!match) return null;
  const [, amount, unit] = match;
  const factor = DURATION_MAP[unit];
  return factor ? Number(amount) * factor : null;
}

export function buildDurationSelect(actionType, caseId, lang = 'en', selectedPreset = null) {
  const language = lang === 'de' ? 'de' : 'en';
  const presets = actionType === ACTION.BAN ? BAN_PRESETS : TIMEOUT_PRESETS;
  const select = new StringSelectMenuBuilder()
    .setCustomId(encodeCustomId(actionType, caseId))
    .setPlaceholder(language === 'de' ? 'Dauer wählen' : 'Select duration')
    .setMinValues(1)
    .setMaxValues(1);

  for (const preset of presets) {
    const label = preset === 'permanent'
      ? language === 'de'
        ? 'Permanent'
        : 'Permanent'
      : preset;
    select.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(label)
        .setValue(preset)
        .setDefault(selectedPreset === preset)
    );
  }

  return new ActionRowBuilder().addComponents(select);
}

export function isDurationSelect(interaction) {
  return interaction.isStringSelectMenu() && interaction.customId.startsWith(`${CUSTOM_IDS.DURATION_SELECT}:`);
}

function replaceDurationRow(rows, newDurationRow) {
  if (!rows?.length) {
    return [newDurationRow];
  }

  let replaced = false;
  const mapped = rows.map((row) => {
    const isDurationRow = row.components?.some((component) =>
      component.customId?.startsWith(`${CUSTOM_IDS.DURATION_SELECT}:`)
    );
    if (isDurationRow) {
      replaced = true;
      return newDurationRow;
    }
    return ActionRowBuilder.from(row);
  });

  if (!replaced) {
    mapped.unshift(newDurationRow);
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

export async function handleDurationSelect(interaction) {
  const lang = detectLangFromInteraction(interaction) ?? 'en';
  const { actionType, caseId } = parseCustomId(interaction.customId);
  const embed = coreEmbed('ANN', lang);
  const errorMessage =
    lang === 'de'
      ? 'Etwas ist schiefgelaufen. Bitte versuche es erneut.'
      : 'Something went wrong. Please try again.';

  try {
    await interaction.deferUpdate({ flags: MessageFlags.Ephemeral });

    const value = interaction.values?.[0];
    if (!caseId || !value) {
      embed.setDescription(lang === 'de' ? 'Ungültige Auswahl.' : 'Invalid selection.');
      await editReplyWithFallback(interaction, {
        embeds: [embed],
        components: interaction.message?.components ?? [],
      });
      return;
    }

    const caseRecord = await getCaseById(caseId);
    if (!caseRecord) {
      embed.setDescription(
          lang === 'de' ? 'Der Fall wurde nicht gefunden.' : 'The case could not be found.'
        );
      await editReplyWithFallback(interaction, {
        embeds: [embed],
        components: interaction.message?.components ?? [],
      });
      return;
    }

    if (caseRecord.actionType !== actionType) {
      embed.setDescription(
          lang === 'de' ? 'Aktion passt nicht zum Fall.' : 'Action type does not match this case.'
        );
      await editReplyWithFallback(interaction, {
        embeds: [embed],
        components: interaction.message?.components ?? [],
      });
      return;
    }

    let endTs = null;
    let permanent = false;

    if (value === 'permanent') {
      permanent = true;
    } else {
      const durationMs = presetToMs(value);
      if (!durationMs) {
        embed.setDescription(
            lang === 'de'
              ? 'Die Dauer konnte nicht verarbeitet werden.'
              : 'The duration could not be processed.'
          );
        await editReplyWithFallback(interaction, {
          embeds: [embed],
          components: interaction.message?.components ?? [],
        });
        return;
      }
      endTs = new Date(Date.now() + durationMs);
    }

    await updateCaseDuration(caseId, { endTs, permanent });

    const updated = await getCaseById(caseId);
    const selectedPreset = updated?.permanent ? 'permanent' : value;
    const newDurationRow = buildDurationSelect(
      actionType,
      caseId,
      lang,
      selectedPreset
    );
    const updatedComponents = replaceDurationRow(interaction.message?.components ?? [], newDurationRow);

    embed.setDescription(
        lang === 'de'
          ? `Dauer gesetzt: ${value === 'permanent' ? 'Permanent' : value}`
          : `Duration set: ${value === 'permanent' ? 'Permanent' : value}`
      );

    await editReplyWithFallback(interaction, {
      embeds: [embed],
      components: updatedComponents,
    });
  } catch (error) {
    uiLogger.error('Failed to handle duration select', error);

    if (!interaction.deferred && !interaction.replied) {
      try {
        await interaction.deferUpdate({ flags: MessageFlags.Ephemeral });
      } catch (deferError) {
        uiLogger.error('Failed to defer interaction for duration select', deferError);
      }
    }

    const failureEmbed = coreEmbed('ANN', lang).setDescription(errorMessage);

    await editReplyWithFallback(interaction, {
      embeds: [failureEmbed],
      components: interaction.message?.components ?? [],
    });
  }
}

export { encodeCustomId as buildDurationCustomId };
