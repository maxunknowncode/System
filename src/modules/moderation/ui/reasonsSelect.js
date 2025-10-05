import {
  ActionRowBuilder,
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
    .setMaxValues(3);

  for (const code of REASON_CODES) {
    const label = REASON_LABELS[language][code] ?? code;
    select.addOptions(new StringSelectMenuOptionBuilder().setLabel(label).setValue(code));
  }

  return new ActionRowBuilder().addComponents(select);
}

export function isReasonsSelect(interaction) {
  return interaction.isStringSelectMenu() && interaction.customId.startsWith(`${CUSTOM_IDS.REASON_SELECT}:`);
}

export async function handleReasonsSelect(interaction) {
  const caseId = parseCustomId(interaction.customId);
  const lang = detectLangFromInteraction(interaction);
  const embed = coreEmbed('ANN', lang);

  if (!caseId) {
    embed.setColor(ERROR_COLOR).setDescription(lang === 'de' ? 'Der Fall fehlt.' : 'Missing case identifier.');
    await interaction.reply({ ephemeral: true, embeds: [embed] });
    return;
  }

  const caseRecord = await getCaseById(caseId);
  if (!caseRecord) {
    embed.setColor(ERROR_COLOR).setDescription(lang === 'de' ? 'Fall nicht gefunden.' : 'Case not found.');
    await interaction.reply({ ephemeral: true, embeds: [embed] });
    return;
  }

  if (caseRecord.status !== STATUS.PENDING) {
    embed.setColor(ERROR_COLOR).setDescription(
      lang === 'de' ? 'Dieser Fall wurde bereits bearbeitet.' : 'This case has already been processed.'
    );
    await interaction.reply({ ephemeral: true, embeds: [embed] });
    return;
  }

  const values = interaction.values ?? [];
  if (!values.length) {
    embed.setColor(ERROR_COLOR).setDescription(lang === 'de' ? 'Mindestens ein Grund ist nötig.' : 'Select at least one reason.');
    await interaction.reply({ ephemeral: true, embeds: [embed] });
    return;
  }

  await setPendingReasons(caseId, values);

  if (!values.includes('CUSTOM')) {
    await setPendingCustomReason(caseId, null);
    const labelMap = REASON_LABELS[language] ?? {};
    embed
      .setColor(SUCCESS_COLOR)
      .setDescription(
        language === 'de'
          ? `Gründe gespeichert: ${values.map((code) => labelMap[code] ?? code).join(', ')}`
          : `Reasons saved: ${values.map((code) => labelMap[code] ?? code).join(', ')}`
      );
    await interaction.reply({ ephemeral: true, embeds: [embed] });
    return;
  }

  const modal = buildCustomReasonModal(caseId, lang);
  await interaction.showModal(modal);
}

export { encodeCustomId as buildReasonCustomId };
