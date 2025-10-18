import {
  MENU_CUSTOM_ID,
  BTN_CLAIM_ID,
  BTN_CLOSE_ID,
  BTN_CLOSE_CONFIRM_ID,
  BTN_REOPEN_ID,
  BTN_REOPEN_CONFIRM_ID,
  BTN_DELETE_ID,
  BTN_DELETE_CONFIRM_ID,
  TICKET_ACTIVE_CATEGORY_ID,
  TICKET_ARCHIVE_CATEGORY_ID,
} from './config.js';
import { openTicket } from './open.js';
import {
  applyClosedPermissions,
  applyOpenPermissions,
  findTicketOwner,
  isTeam,
  setStatusPrefix,
} from './utils.js';
import { coreEmbed } from '../../util/embeds/core.js';
import { detectLangFromInteraction } from '../../util/embeds/lang.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';
import { logger } from '../../util/logging/logger.js';
import { TICKET_MESSAGES, resolveText } from '../../i18n/messages.js';

const ticketLogger = logger.withPrefix('tickets:interactions');

export async function handleTicketInteractions(interaction, client) {
  const lang = detectLangFromInteraction(interaction);

  if (interaction.isStringSelectMenu() && interaction.customId === MENU_CUSTOM_ID) {
    const value = interaction.values?.[0];
    if (value === 'support_en') {
      await openTicket(interaction, 'en');
    } else if (value === 'support_de') {
      await openTicket(interaction, 'de');
    }
    return;
  }

  if (!interaction.isButton()) return;

  switch (interaction.customId) {
    case BTN_CLAIM_ID: {
      if (!isTeam(interaction.member)) {
        const embed = coreEmbed('TICKET', lang)
          .setTitle(resolveText(TICKET_MESSAGES.claimDeniedTitle, lang))
          .setDescription(resolveText(TICKET_MESSAGES.claimDeniedDescription, lang))
          .setColor(0xff0000);
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
        return;
      }
      await interaction.deferUpdate();
      await setStatusPrefix(interaction.channel, 'claimed');
      const info = coreEmbed('TICKET', lang)
        .setColor(0x57f287)
        .setDescription(
          resolveText(TICKET_MESSAGES.claimedAnnouncement, lang, { userId: interaction.user.id })
        );
      await interaction.channel.send({
        embeds: [info],
        allowedMentions: { users: [interaction.user.id], parse: [] },
      });
      return;
    }
    case BTN_CLOSE_ID: {
      const btn = new ButtonBuilder()
        .setCustomId(BTN_CLOSE_CONFIRM_ID)
        .setLabel('Confirm')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Primary);
      const row = new ActionRowBuilder().addComponents(btn);
      const embed = coreEmbed('TICKET', lang).setDescription(
        resolveText(TICKET_MESSAGES.confirmClose, lang)
      );
      await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
      return;
    }
    case BTN_CLOSE_CONFIRM_ID: {
      let startMsg;
      try {
        const messages = await interaction.channel.messages.fetch({ limit: 20 });
        startMsg = messages.find(
          (m) =>
            m.author.id === client.user.id &&
            m.components.some((row) =>
              row.components.some((c) => [BTN_CLAIM_ID, BTN_CLOSE_ID, BTN_REOPEN_ID].includes(c.customId))
            )
        );
      } catch (err) {
        ticketLogger.error('Startnachricht konnte nicht geladen werden:', err);
      }
      if (TICKET_ARCHIVE_CATEGORY_ID) {
        try {
          await interaction.channel.setParent(TICKET_ARCHIVE_CATEGORY_ID);
        } catch (err) {
          ticketLogger.error('Kategorie konnte nicht gesetzt werden:', err);
        }
      }
      const ownerId = findTicketOwner(interaction.channel, client.user.id);
      if (ownerId) {
        try {
          await applyClosedPermissions(interaction.channel, ownerId);
        } catch (err) {
          ticketLogger.warn('Berechtigungen konnten nicht angepasst werden:', err);
        }
      }
      if (startMsg) {
        const reopenBtn = new ButtonBuilder()
          .setCustomId(BTN_REOPEN_ID)
          .setLabel('Reopen')
          .setEmoji('🔓')
          .setStyle(ButtonStyle.Secondary);
        const deleteBtn = new ButtonBuilder()
          .setCustomId(BTN_DELETE_ID)
          .setLabel('Delete')
          .setEmoji('🗑️')
          .setStyle(ButtonStyle.Danger);
        const row = new ActionRowBuilder().addComponents(reopenBtn, deleteBtn);
        await startMsg.edit({ components: [row], embeds: startMsg.embeds, allowedMentions: { parse: [] } });
      }
      await setStatusPrefix(interaction.channel, 'closed');
      const embed = coreEmbed('TICKET', lang).setDescription(
        resolveText(TICKET_MESSAGES.archived, lang)
      );
      await interaction.update({ embeds: [embed], components: [], allowedMentions: { parse: [] } });
      return;
    }
    case BTN_REOPEN_ID: {
      const btn = new ButtonBuilder()
        .setCustomId(BTN_REOPEN_CONFIRM_ID)
        .setLabel('Confirm')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Primary);
      const row = new ActionRowBuilder().addComponents(btn);
      await interaction.reply({
        content: resolveText(TICKET_MESSAGES.confirmReopen, lang),
        components: [row],
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [] },
      });
      return;
    }
    case BTN_REOPEN_CONFIRM_ID: {
      let startMsg;
      try {
        const messages = await interaction.channel.messages.fetch({ limit: 20 });
        startMsg = messages.find(
          (m) =>
            m.author.id === client.user.id &&
            m.components.some((row) =>
              row.components.some((c) => [BTN_REOPEN_ID, BTN_DELETE_ID].includes(c.customId))
            )
        );
      } catch (err) {
        ticketLogger.error('Startnachricht konnte nicht geladen werden:', err);
      }
      if (TICKET_ACTIVE_CATEGORY_ID) {
        try {
          await interaction.channel.setParent(TICKET_ACTIVE_CATEGORY_ID);
        } catch (err) {
          ticketLogger.error('Kategorie konnte nicht gesetzt werden:', err);
        }
      }
      await setStatusPrefix(interaction.channel, 'neutral');
      const ownerId = findTicketOwner(interaction.channel, client.user.id);
      if (ownerId) {
        try {
          await applyOpenPermissions(interaction.channel, ownerId);
        } catch (err) {
          ticketLogger.warn('Berechtigungen konnten nicht angepasst werden:', err);
        }
      }
      if (startMsg) {
        const claimBtn = new ButtonBuilder()
          .setCustomId(BTN_CLAIM_ID)
          .setLabel('Claim')
          .setEmoji('✅')
          .setStyle(ButtonStyle.Success);
        const closeBtn = new ButtonBuilder()
          .setCustomId(BTN_CLOSE_ID)
          .setLabel('Close')
          .setEmoji('🔒')
          .setStyle(ButtonStyle.Danger);
        const row = new ActionRowBuilder().addComponents(claimBtn, closeBtn);
        await startMsg.edit({ components: [row], embeds: startMsg.embeds, allowedMentions: { parse: [] } });
      }
      const info = coreEmbed('TICKET', lang)
        .setDescription(
          resolveText(TICKET_MESSAGES.reopenedInfo, lang)
        );
      await interaction.channel.send({ embeds: [info], allowedMentions: { parse: [] } });
      await interaction.update({
        content: resolveText(TICKET_MESSAGES.reopenedNotice, lang),
        components: [],
        allowedMentions: { parse: [] },
      });
      return;
    }
    case BTN_DELETE_ID: {
      const btn = new ButtonBuilder()
        .setCustomId(BTN_DELETE_CONFIRM_ID)
        .setLabel('Confirm')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Danger);
      const row = new ActionRowBuilder().addComponents(btn);
      const embed = coreEmbed('TICKET', lang).setDescription(
        resolveText(TICKET_MESSAGES.confirmDelete, lang)
      );
      await interaction.reply({
        embeds: [embed],
        components: [row],
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [] },
      });
      return;
    }
    case BTN_DELETE_CONFIRM_ID: {
      const embed = coreEmbed('TICKET', lang).setDescription(
        resolveText(TICKET_MESSAGES.deleting, lang)
      );
      await interaction.update({ embeds: [embed], components: [], allowedMentions: { parse: [] } });
      setTimeout(
        () =>
          interaction.channel
            .delete()
            .catch((err) => ticketLogger.error('Kanal konnte nicht gelöscht werden:', err)),
        5000,
      );
      return;
    }
    default:
      return;
  }
}

