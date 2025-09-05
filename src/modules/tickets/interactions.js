import {
  MENU_CUSTOM_ID,
  BTN_CLAIM_ID,
  BTN_CLOSE_ID,
  BTN_DELETE_ID,
  BTN_ACK_PRIVATE_ID,
  TICKET_ARCHIVE_CATEGORY_ID,
} from './config.js';
import { openTicket } from './open.js';
import { isTeam } from './utils.js';
import { FOOTER } from '../../util/footer.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';

export async function handleTicketInteractions(interaction, client) {
  if (interaction.isStringSelectMenu() && interaction.customId === MENU_CUSTOM_ID) {
    await interaction.deferReply({ ephemeral: true });
    const success = await openTicket(interaction);
    if (success) {
      await interaction.deleteReply().catch(() => {});
    }
    return;
  }

  if (!interaction.isButton()) return;

  if (interaction.customId === BTN_CLAIM_ID) {
    if (!isTeam(interaction.member)) {
      await interaction.reply({ content: '```Kein Teammitglied```', ephemeral: true });
      return;
    }
    await interaction.deferUpdate();

    const embed = EmbedBuilder.from(interaction.message.embeds[0]);
    embed.data.fields = embed.data.fields.map((f) =>
      f.name === 'Status'
        ? {
            ...f,
            value: `🟢 Claimed by <@${interaction.user.id}> / 🟢 Übernommen von <@${interaction.user.id}>`,
          }
        : f
    );
    await interaction.message.edit({ embeds: [embed] });

    const info = new EmbedBuilder()
      .setDescription(`Claimed by <@${interaction.user.id}>\nÜbernommen von <@${interaction.user.id}>`)
      .setFooter(FOOTER);
    await interaction.channel.send({ embeds: [info] });
    return;
  }

  if (interaction.customId === BTN_CLOSE_ID) {
    await interaction.reply({ content: '```Schließen```', ephemeral: true });

    if (TICKET_ARCHIVE_CATEGORY_ID) {
      try {
        await interaction.channel.setParent(TICKET_ARCHIVE_CATEGORY_ID);
      } catch {}
    } else {
      const createdField = interaction.message.embeds[0]?.fields?.find((f) => f.name === 'Created by');
      const openerId = createdField?.value.match(/<@(\d+)>/)?.[1];
      if (openerId) {
        try {
          await interaction.channel.permissionOverwrites.edit(openerId, { SendMessages: false });
        } catch {}
      }
    }

    const embed = EmbedBuilder.from(interaction.message.embeds[0]);
    embed.data.fields = embed.data.fields.map((f) =>
      f.name === 'Status' ? { ...f, value: '🔴 Closed / 🔴 Geschlossen' } : f
    );

    const deleteBtn = new ButtonBuilder()
      .setCustomId(BTN_DELETE_ID)
      .setLabel('Delete')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🗑️');
    const ackBtn = new ButtonBuilder()
      .setCustomId(BTN_ACK_PRIVATE_ID)
      .setLabel('Privat wieder bestätigen')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🔒');

    const row = new ActionRowBuilder().addComponents(deleteBtn, ackBtn);
    await interaction.message.edit({ embeds: [embed], components: [row] });

    setTimeout(() => {
      const disabledRow = new ActionRowBuilder().addComponents(
        ButtonBuilder.from(deleteBtn).setDisabled(true),
        ButtonBuilder.from(ackBtn).setDisabled(true)
      );
      interaction.message.edit({ components: [disabledRow] }).catch(() => {});
    }, 5000);
    return;
  }

  if (interaction.customId === BTN_ACK_PRIVATE_ID) {
    await interaction.reply({ content: '```Privat wieder bestätigen```', ephemeral: true });
    return;
  }

  if (interaction.customId === BTN_DELETE_ID) {
    if (!isTeam(interaction.member)) {
      await interaction.reply({ content: '```Kein Teammitglied```', ephemeral: true });
      return;
    }
    await interaction.reply({ content: '```Löschen```', ephemeral: true });
    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 5000);
  }
}
