import {
  ActionRowBuilder,
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

export async function handleDurationSelect(interaction) {
  const { actionType, caseId } = parseCustomId(interaction.customId);
  const lang = detectLangFromInteraction(interaction);
  const embed = coreEmbed('ANN', lang);

  const value = interaction.values?.[0];
  if (!caseId || !value) {
    embed.setColor(ERROR_COLOR).setDescription(
      lang === 'de' ? 'Ungültige Auswahl.' : 'Invalid selection.'
    );
    await interaction.reply({ ephemeral: true, embeds: [embed] });
    return;
  }

  const caseRecord = await getCaseById(caseId);
  if (!caseRecord) {
    embed.setColor(ERROR_COLOR).setDescription(
      lang === 'de' ? 'Der Fall wurde nicht gefunden.' : 'The case could not be found.'
    );
    await interaction.reply({ ephemeral: true, embeds: [embed] });
    return;
  }

  if (caseRecord.actionType !== actionType) {
    embed.setColor(ERROR_COLOR).setDescription(
      lang === 'de' ? 'Aktion passt nicht zum Fall.' : 'Action type does not match this case.'
    );
    await interaction.reply({ ephemeral: true, embeds: [embed] });
    return;
  }

  let endTs = null;
  let permanent = false;

  if (value === 'permanent') {
    permanent = true;
  } else {
    const durationMs = presetToMs(value);
    if (!durationMs || !caseRecord.createdAt) {
      embed.setColor(ERROR_COLOR).setDescription(
        lang === 'de' ? 'Die Dauer konnte nicht verarbeitet werden.' : 'The duration could not be processed.'
      );
      await interaction.reply({ ephemeral: true, embeds: [embed] });
      return;
    }
    endTs = new Date(caseRecord.createdAt.getTime() + durationMs);
  }

  await updateCaseDuration(caseId, { endTs, permanent });

  embed
    .setColor(SUCCESS_COLOR)
    .setDescription(
      lang === 'de'
        ? `Dauer gesetzt: ${value === 'permanent' ? 'Permanent' : value}`
        : `Duration set: ${value === 'permanent' ? 'Permanent' : value}`
    );

  await interaction.reply({ ephemeral: true, embeds: [embed] });
}

export { encodeCustomId as buildDurationCustomId };
