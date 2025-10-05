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

function encodeCustomId(caseId) {
  return `${CUSTOM_IDS.REASON_SELECT}:${caseId}`;
}

function parseCustomId(customId) {
  const [, caseId] = customId.split(':');
  return caseId;
}

export function buildReasonsSelect(caseId, lang = 'en') {
  const language = lang === 'de' ? 'de' : 'en';
  const select = new StringSelectMenuBuilder()
    .setCustomId(encodeCustomId(caseId))
    .setPlaceholder(language === 'de' ? 'Gründe auswählen' : 'Select reasons')
    .setMinValues(1)
    .setMaxValues(5);

  for (const code of REASON_CODES) {
    const label = REASON_LABELS[language][code] ?? code;
    select.addOptions(new StringSelectMenuOptionBuilder().setLabel(label).setValue(code));
  }

  return new ActionRowBuilder().addComponents(select);
}

export function isReasonsSelect(interaction) {
  return interaction.isStringSelectMenu() && interaction.customId.startsWith(`${CUSTOM_IDS.REASON_SELECT}:`);
}

function safeEditReply(interaction, payload) {
  return interaction.editReply(payload).catch((error) => {
    if (error?.code === RESTJSONErrorCodes.UnknownMessage) {
      return null;
    }
    throw error;
  });
}

export async function handleReasonsSelect(interaction) {
  const lang = detectLangFromInteraction(interaction) ?? 'en';
  const caseId = parseCustomId(interaction.customId);
  const embed = coreEmbed('ANN', lang);

  if (!caseId) {
    embed.setColor(ERROR_COLOR).setDescription(
      lang === 'de' ? 'Der Fall fehlt.' : 'Missing case identifier.'
    );
    await interaction.deferUpdate({ flags: MessageFlags.Ephemeral });
    await safeEditReply(interaction, {
      embeds: [embed],
      components: interaction.message?.components ?? [],
    });
    return;
  }

  const caseRecord = await getCaseById(caseId);
  if (!caseRecord) {
    embed.setColor(ERROR_COLOR).setDescription(lang === 'de' ? 'Fall nicht gefunden.' : 'Case not found.');
    await interaction.deferUpdate({ flags: MessageFlags.Ephemeral });
    await safeEditReply(interaction, {
      embeds: [embed],
      components: interaction.message?.components ?? [],
    });
    return;
  }

  if (caseRecord.status !== STATUS.PENDING) {
    embed.setColor(ERROR_COLOR).setDescription(
      lang === 'de' ? 'Dieser Fall wurde bereits bearbeitet.' : 'This case has already been processed.'
    );
    await interaction.deferUpdate({ flags: MessageFlags.Ephemeral });
    await safeEditReply(interaction, {
      embeds: [embed],
      components: interaction.message?.components ?? [],
    });
    return;
  }

  const rawValues = interaction.values ?? [];
  const uniqueValues = Array.from(new Set(rawValues));

  if (!uniqueValues.length) {
    embed.setColor(ERROR_COLOR).setDescription(
      lang === 'de' ? 'Bitte wähle mindestens einen Grund.' : 'Please select at least one reason.'
    );
    await interaction.deferUpdate({ flags: MessageFlags.Ephemeral });
    await safeEditReply(interaction, {
      embeds: [embed],
      components: interaction.message?.components ?? [],
    });
    return;
  }

  if (uniqueValues.length > 5) {
    embed.setColor(ERROR_COLOR).setDescription(
      lang === 'de' ? 'Maximal 5 Gründe möglich.' : 'You can choose at most 5 reasons.'
    );
    await interaction.deferUpdate({ flags: MessageFlags.Ephemeral });
    await safeEditReply(interaction, {
      embeds: [embed],
      components: interaction.message?.components ?? [],
    });
    return;
  }

  const needsCustom = uniqueValues.includes('CUSTOM');
  const filtered = uniqueValues.filter((code) => code !== 'CUSTOM');

  if (needsCustom) {
    await setPendingReasons(caseId, filtered, lang);
    await setPendingCustomReason(caseId, null, lang);
    const modal = buildCustomReasonModal(caseId, lang);
    await interaction.showModal(modal);
    return;
  }

  await interaction.deferUpdate({ flags: MessageFlags.Ephemeral });

  await setPendingReasons(caseId, filtered, lang);
  await setPendingCustomReason(caseId, null, lang);

  const language = lang === 'de' ? 'de' : 'en';
  const labelMap = REASON_LABELS[language] ?? {};
  embed
    .setColor(SUCCESS_COLOR)
    .setDescription(
      language === 'de'
        ? `Gründe gespeichert: ${filtered.map((code) => labelMap[code] ?? code).join(', ')}`
        : `Reasons saved: ${filtered.map((code) => labelMap[code] ?? code).join(', ')}`
    );

  await safeEditReply(interaction, {
    embeds: [embed],
    components: interaction.message?.components ?? [],
  });
}

export { encodeCustomId as buildReasonCustomId };
