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

function safeEditReply(interaction, payload) {
  return interaction.editReply(payload).catch((error) => {
    if (error?.code === RESTJSONErrorCodes.UnknownMessage) {
      return null;
    }
    throw error;
  });
}

export async function handleCustomReasonModal(interaction) {
  const lang = detectLangFromInteraction(interaction) ?? 'en';
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const caseId = parseCustomId(interaction.customId);
  const embed = coreEmbed('ANN', lang);

  if (!caseId) {
    embed.setColor(ERROR_COLOR).setDescription(lang === 'de' ? 'Fall-ID fehlt.' : 'Missing case id.');
    await safeEditReply(interaction, { embeds: [embed] });
    return;
  }

  const caseRecord = await getCaseById(caseId);
  if (!caseRecord || caseRecord.status !== STATUS.PENDING) {
    embed.setColor(ERROR_COLOR).setDescription(
      lang === 'de' ? 'Dieser Fall wurde bereits bearbeitet.' : 'This case has already been processed.'
    );
    await safeEditReply(interaction, { embeds: [embed] });
    return;
  }

  const rawValue = interaction.fields.getTextInputValue(INPUT_ID);
  const value = typeof rawValue === 'string' ? rawValue.trim() : '';
  if (!value) {
    embed.setColor(ERROR_COLOR).setDescription(lang === 'de' ? 'Bitte gib einen Grund ein.' : 'Please provide a reason.');
    await safeEditReply(interaction, { embeds: [embed] });
    return;
  }

  const limited = value.slice(0, 300);
  await setPendingCustomReason(caseId, limited, lang);

  embed
    .setColor(SUCCESS_COLOR)
    .setDescription(lang === 'de' ? 'Eigener Grund gespeichert.' : 'Custom reason saved.');

  await safeEditReply(interaction, { embeds: [embed] });
}

export { encodeCustomId as buildCustomReasonCustomId };
