import {
  MENU_EN_CUSTOM_ID,
  MENU_DE_CUSTOM_ID,
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
import { isTeam, setStatusPrefix } from './utils.js';
import { FOOTER } from '../../util/footer.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';

export async function handleTicketInteractions(interaction, client) {
  if (interaction.isStringSelectMenu() &&
      (interaction.customId === MENU_EN_CUSTOM_ID || interaction.customId === MENU_DE_CUSTOM_ID)) {
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
        await interaction.reply({
          content: 'Kein Teammitglied | Not a team member',
          ephemeral: true,
          allowedMentions: { parse: [] },
        });
        return;
      }
      await interaction.deferUpdate();
      const embed = EmbedBuilder.from(interaction.message.embeds[0]);
      embed.data.fields = embed.data.fields.map((f) =>
        f.name === 'Status'
          ? {
              ...f,
              value: `🇺🇸 Claimed by <@${interaction.user.id}>\n🇩🇪 Übernommen von <@${interaction.user.id}>`,
            }
          : f
      );
      await interaction.message.edit({
        embeds: [embed],
        components: interaction.message.components,
        allowedMentions: { parse: [] },
      });
      await setStatusPrefix(interaction.channel, 'claimed');
      const info = new EmbedBuilder()
        .setDescription(
          `🇺🇸 Claimed by <@${interaction.user.id}>\n🇩🇪 Übernommen von <@${interaction.user.id}>`
        )
        .setFooter(FOOTER);
      await interaction.channel.send({ embeds: [info], allowedMentions: { parse: [] } });
      return;
    }
    case BTN_CLOSE_ID: {
      const btn = new ButtonBuilder()
        .setCustomId(BTN_CLOSE_CONFIRM_ID)
        .setLabel('Confirm')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Primary);
      const row = new ActionRowBuilder().addComponents(btn);
      await interaction.reply({
        content:
          '🇺🇸 Are you sure you want to close this ticket?\n🇩🇪 Bist du sicher, dass du dieses Ticket schließen möchtest?',
        components: [row],
        ephemeral: true,
        allowedMentions: { parse: [] },
      });
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
      } catch {}
      if (TICKET_ARCHIVE_CATEGORY_ID) {
        try {
          await interaction.channel.setParent(TICKET_ARCHIVE_CATEGORY_ID);
        } catch {}
      }
      if (startMsg) {
        const embed = EmbedBuilder.from(startMsg.embeds[0]);
        embed.data.fields = embed.data.fields.map((f) =>
          f.name === 'Status'
            ? { ...f, value: '🇺🇸 Ticket archived\n🇩🇪 Ticket archiviert' }
            : f
        );
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
        await startMsg.edit({ embeds: [embed], components: [row], allowedMentions: { parse: [] } });
      }
      await setStatusPrefix(interaction.channel, 'closed');
      await interaction.update({
        content: '🇺🇸 Ticket archived\n🇩🇪 Ticket archiviert',
        components: [],
        allowedMentions: { parse: [] },
      });
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
        content: '🇺🇸 Reopen this ticket?\n🇩🇪 Dieses Ticket wieder eröffnen?',
        components: [row],
        ephemeral: true,
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
      } catch {}
      if (TICKET_ACTIVE_CATEGORY_ID) {
        try {
          await interaction.channel.setParent(TICKET_ACTIVE_CATEGORY_ID);
        } catch {}
      }
      await setStatusPrefix(interaction.channel, 'neutral');
      if (startMsg) {
        const embed = EmbedBuilder.from(startMsg.embeds[0]);
        embed.data.fields = embed.data.fields.map((f) =>
          f.name === 'Status' ? { ...f, value: 'Unclaimed | Nicht übernommen' } : f
        );
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
        await startMsg.edit({ embeds: [embed], components: [row], allowedMentions: { parse: [] } });
      }
      const info = new EmbedBuilder()
        .setDescription(
          '🔓 Ticket reopened | 🔓 Ticket wieder eröffnet\n• Please describe your issue. | Bitte beschreibe dein Anliegen.'
        )
        .setFooter(FOOTER);
      await interaction.channel.send({ embeds: [info], allowedMentions: { parse: [] } });
      await interaction.update({
        content: 'Reopened | Wieder eröffnet',
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
      await interaction.reply({
        content:
          '🇺🇸 Are you sure you want to delete this ticket?\n🇩🇪 Bist du sicher, dass du dieses Ticket löschen möchtest?',
        components: [row],
        ephemeral: true,
        allowedMentions: { parse: [] },
      });
      return;
    }
    case BTN_DELETE_CONFIRM_ID: {
      await interaction.update({
        content: '🇺🇸 Deleting in 5 seconds…\n🇩🇪 Löschen in 5 Sekunden…',
        components: [],
        allowedMentions: { parse: [] },
      });
      setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
      return;
    }
    default:
      return;
  }
}

