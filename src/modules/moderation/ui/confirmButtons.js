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
import { CUSTOM_IDS, CONFIRM_ACTION, ERROR_COLOR, STATUS } from '../constants.js';
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

function safeEditReply(interaction, payload) {
  return interaction.editReply(payload).catch((error) => {
    if (error?.code === RESTJSONErrorCodes.UnknownMessage) {
      return null;
    }
    throw error;
  });
}

export async function handleConfirmButton(interaction) {
  const lang = detectLangFromInteraction(interaction) ?? 'en';
  await interaction.deferUpdate({ flags: MessageFlags.Ephemeral });

  const { actionType, caseId, decision } = parseCustomId(interaction.customId);

  if (!caseId) {
    const embed = coreEmbed('ANN', lang).setColor(ERROR_COLOR).setDescription(
      lang === 'de' ? 'Fall-ID fehlt.' : 'Missing case id.'
    );
    await safeEditReply(interaction, { embeds: [embed] });
    return;
  }

  if (![CONFIRM_ACTION.CONFIRM, CONFIRM_ACTION.CANCEL].includes(decision)) {
    const embed = coreEmbed('ANN', lang).setColor(ERROR_COLOR).setDescription(
      lang === 'de' ? 'Unbekannte Aktion.' : 'Unknown action.'
    );
    await safeEditReply(interaction, { embeds: [embed] });
    return;
  }

  const caseRecord = await getCaseById(caseId);
  if (!caseRecord) {
    const embed = coreEmbed('ANN', lang).setColor(ERROR_COLOR).setDescription(
      lang === 'de' ? 'Fall nicht gefunden.' : 'Case not found.'
    );
    await safeEditReply(interaction, { embeds: [embed] });
    return;
  }

  if (caseRecord.status !== STATUS.PENDING) {
    const embed = coreEmbed('ANN', lang).setColor(ERROR_COLOR).setDescription(
      lang === 'de' ? 'Dieser Fall wurde bereits bearbeitet.' : 'This case has already been processed.'
    );
    await safeEditReply(interaction, { embeds: [embed] });
    return;
  }

  if (decision === CONFIRM_ACTION.CANCEL) {
    await markCaseFailed(caseId);
    const disabled = disableComponents(interaction.message.components);
    await safeEditReply(interaction, { components: disabled });
    const embed = coreEmbed('ANN', lang)
      .setColor(ERROR_COLOR)
      .setDescription(lang === 'de' ? 'Fall verworfen.' : 'Case cancelled.');
    await safeEditReply(interaction, { embeds: [embed] });
    return;
  }

  const disabledComponents = disableComponents(interaction.message.components);
  await safeEditReply(interaction, { components: disabledComponents });

  const guild = interaction.guild;
  if (!guild) {
    const embed = coreEmbed('ANN', lang)
      .setColor(ERROR_COLOR)
      .setDescription(
        lang === 'de' ? 'Keine Guild verfügbar.' : 'Guild unavailable.'
      );
    await safeEditReply(interaction, { embeds: [embed] });
    return;
  }

  const targetMember = await guild.members.fetch(caseRecord.userId).catch(() => null);
  const targetUser = targetMember?.user ?? (await guild.client.users.fetch(caseRecord.userId).catch(() => null));

  let result;
  try {
    result = await executeAction({
      interaction,
      caseId,
      actionType: actionType ?? caseRecord.actionType,
      guild,
      moderator: interaction.member,
      targetMember,
      targetUser,
      reasonCodes: caseRecord.reasonCodes,
      customReason: caseRecord.customReason,
      lang,
    });
  } catch (error) {
    uiLogger.error('Execution failed', error);
    const errorEmbed = coreEmbed('ANN', lang)
      .setColor(ERROR_COLOR)
      .setDescription(lang === 'de' ? 'Aktion fehlgeschlagen.' : 'Action failed.');
    await safeEditReply(interaction, { embeds: [errorEmbed] });
    return;
  }

  if (!result.ok) {
    const fresh = await getCaseById(caseId);
    if (fresh && fresh.status !== STATUS.PENDING) {
      const disabled = disableComponents(interaction.message.components);
      await safeEditReply(interaction, { components: disabled });
    }
    await safeEditReply(interaction, { embeds: [result.embed] });
    return;
  }

  await safeEditReply(interaction, {
    components: disableComponents(interaction.message.components),
    embeds: [result.embed],
  });
}

export { encodeCustomId as buildConfirmCustomId };
