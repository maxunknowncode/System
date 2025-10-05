import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from 'discord.js';
import { coreEmbed } from '../../../util/embeds/core.js';
import { detectLangFromInteraction } from '../../../util/embeds/lang.js';
import { CUSTOM_IDS, ERROR_COLOR, SUCCESS_COLOR, STATUS } from '../constants.js';
import { setPendingCustomReason } from '../service/exec.js';
import { getCaseById } from '../storage/repo.js';

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

export async function handleCustomReasonModal(interaction) {
  const caseId = parseCustomId(interaction.customId);
  const lang = detectLangFromInteraction(interaction);
  const embed = coreEmbed('ANN', lang);

  if (!caseId) {
    embed.setColor(ERROR_COLOR).setDescription(lang === 'de' ? 'Fall-ID fehlt.' : 'Missing case id.');
    await interaction.reply({ ephemeral: true, embeds: [embed] });
    return;
  }

  const caseRecord = await getCaseById(caseId);
  if (!caseRecord || caseRecord.status !== STATUS.PENDING) {
    embed.setColor(ERROR_COLOR).setDescription(
      lang === 'de' ? 'Dieser Fall wurde bereits bearbeitet.' : 'This case has already been processed.'
    );
    await interaction.reply({ ephemeral: true, embeds: [embed] });
    return;
  }

  const value = interaction.fields.getTextInputValue(INPUT_ID)?.trim();
  if (!value) {
    embed.setColor(ERROR_COLOR).setDescription(lang === 'de' ? 'Bitte gib einen Grund ein.' : 'Please provide a reason.');
    await interaction.reply({ ephemeral: true, embeds: [embed] });
    return;
  }

  await setPendingCustomReason(caseId, value);

  embed
    .setColor(SUCCESS_COLOR)
    .setDescription(lang === 'de' ? 'Eigener Grund gespeichert.' : 'Custom reason saved.');

  await interaction.reply({ ephemeral: true, embeds: [embed] });
}

export { encodeCustomId as buildCustomReasonCustomId };
