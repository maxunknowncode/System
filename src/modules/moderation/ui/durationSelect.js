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
import { ACTION, CUSTOM_IDS, ERROR_COLOR, SUCCESS_COLOR } from '../constants.js';
import { getCaseById, updateCaseDuration } from '../storage/repo.js';

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

export function buildDurationSelect(actionType, caseId, lang = 'en') {
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
    );
  }

  return new ActionRowBuilder().addComponents(select);
}

export function isDurationSelect(interaction) {
  return interaction.isStringSelectMenu() && interaction.customId.startsWith(`${CUSTOM_IDS.DURATION_SELECT}:`);
}

function safeEditReply(interaction, payload) {
  return interaction.editReply(payload).catch((error) => {
    if (error?.code === RESTJSONErrorCodes.UnknownMessage) {
      return null;
    }
    throw error;
  });
}

export async function handleDurationSelect(interaction) {
  const lang = detectLangFromInteraction(interaction) ?? 'en';
  await interaction.deferUpdate({ flags: MessageFlags.Ephemeral });

  const { actionType, caseId } = parseCustomId(interaction.customId);
  const embed = coreEmbed('ANN', lang);

  const value = interaction.values?.[0];
  if (!caseId || !value) {
    embed.setColor(ERROR_COLOR).setDescription(
      lang === 'de' ? 'Ungültige Auswahl.' : 'Invalid selection.'
    );
    await safeEditReply(interaction, {
      embeds: [embed],
      components: interaction.message?.components ?? [],
    });
    return;
  }

  const caseRecord = await getCaseById(caseId);
  if (!caseRecord) {
    embed.setColor(ERROR_COLOR).setDescription(
      lang === 'de' ? 'Der Fall wurde nicht gefunden.' : 'The case could not be found.'
    );
    await safeEditReply(interaction, {
      embeds: [embed],
      components: interaction.message?.components ?? [],
    });
    return;
  }

  if (caseRecord.actionType !== actionType) {
    embed.setColor(ERROR_COLOR).setDescription(
      lang === 'de' ? 'Aktion passt nicht zum Fall.' : 'Action type does not match this case.'
    );
    await safeEditReply(interaction, {
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
      embed.setColor(ERROR_COLOR).setDescription(
        lang === 'de' ? 'Die Dauer konnte nicht verarbeitet werden.' : 'The duration could not be processed.'
      );
      await safeEditReply(interaction, {
        embeds: [embed],
        components: interaction.message?.components ?? [],
      });
      return;
    }
    endTs = new Date(Date.now() + durationMs);
  }

  await updateCaseDuration(caseId, { endTs, permanent });

  embed
    .setColor(SUCCESS_COLOR)
    .setDescription(
      lang === 'de'
        ? `Dauer gesetzt: ${value === 'permanent' ? 'Permanent' : value}`
        : `Duration set: ${value === 'permanent' ? 'Permanent' : value}`
    );

  await safeEditReply(interaction, {
    embeds: [embed],
    components: interaction.message?.components ?? [],
  });
}

export { encodeCustomId as buildDurationCustomId };
