import {
  MENU_CUSTOM_ID,
  BTN_CLAIM_ID,
  BTN_CLOSE_ID,
  BTN_CLOSE_CONFIRM_ID,
  BTN_REOPEN_ID,
  MODAL_REOPEN_ID,
  MODAL_REOPEN_REASON_ID,
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
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

export async function handleTicketInteractions(interaction, client) {
  if (interaction.isStringSelectMenu() && interaction.customId === MENU_CUSTOM_ID) {
    const value = interaction.values?.[0];
    if (value === 'support') {
      await openTicket(interaction);
    }
    return;
  }

  if (interaction.isButton()) {
    switch (interaction.customId) {
      case BTN_CLAIM_ID: {
        if (!isTeam(interaction.member)) {
          await interaction.reply({ content: '```Kein Teammitglied```', ephemeral: true, allowedMentions: { parse: [] } });
          return;
        }
        await interaction.deferUpdate();
        const embed = EmbedBuilder.from(interaction.message.embeds[0]);
        embed.data.fields = embed.data.fields.map((f) =>
          f.name === 'Status'
            ? { ...f, value: `🟢 Claimed by <@${interaction.user.id}> | 🟢 Übernommen von <@${interaction.user.id}>` }
            : f
        );
        await interaction.message.edit({ embeds: [embed], allowedMentions: { parse: [] } });
        await setStatusPrefix(interaction.channel, '🟢 ');
        const info = new EmbedBuilder()
          .setDescription(`Claimed by <@${interaction.user.id}> | Übernommen von <@${interaction.user.id}>`)
          .setFooter(FOOTER);
        await interaction.channel.send({ embeds: [info], allowedMentions: { parse: [] } });
        return;
      }
      case BTN_CLOSE_ID: {
        const confirmBtn = new ButtonBuilder()
          .setCustomId(BTN_CLOSE_CONFIRM_ID)
          .setLabel('Bestätigen')
          .setStyle(ButtonStyle.Danger);
        const row = new ActionRowBuilder().addComponents(confirmBtn);
        await interaction.reply({ content: '```Schließen```', components: [row], ephemeral: true, allowedMentions: { parse: [] } });
        return;
      }
      case BTN_CLOSE_CONFIRM_ID: {
        let startMsg;
        try {
          const messages = await interaction.channel.messages.fetch({ limit: 20 });
          startMsg = messages.find((m) =>
            m.author.id === client.user.id &&
            m.components.some((row) => row.components.some((c) => [BTN_CLAIM_ID, BTN_CLOSE_ID, BTN_REOPEN_ID].includes(c.customId)))
          );
        } catch {}
        if (TICKET_ARCHIVE_CATEGORY_ID) {
          try { await interaction.channel.setParent(TICKET_ARCHIVE_CATEGORY_ID); } catch {}
        }
        if (startMsg) {
          const embed = EmbedBuilder.from(startMsg.embeds[0]);
          embed.data.fields = embed.data.fields.map((f) =>
            f.name === 'Status' ? { ...f, value: '🔴 Closed | 🔴 Geschlossen' } : f
          );
          const reopenBtn = new ButtonBuilder()
            .setCustomId(BTN_REOPEN_ID)
            .setLabel('Reopen')
            .setStyle(ButtonStyle.Secondary);
          const deleteBtn = new ButtonBuilder()
            .setCustomId(BTN_DELETE_ID)
            .setLabel('Delete')
            .setStyle(ButtonStyle.Danger);
          const row = new ActionRowBuilder().addComponents(reopenBtn, deleteBtn);
          await startMsg.edit({ embeds: [embed], components: [row], allowedMentions: { parse: [] } });
        }
        await setStatusPrefix(interaction.channel, '🔴 ');
        await interaction.update({ content: '```Schließen```', components: [], ephemeral: true, allowedMentions: { parse: [] } });
        return;
      }
      case BTN_REOPEN_ID: {
        const modal = new ModalBuilder()
          .setCustomId(MODAL_REOPEN_ID)
          .setTitle('Reopen Ticket');
        const input = new TextInputBuilder()
          .setCustomId(MODAL_REOPEN_REASON_ID)
          .setLabel('Reason | Grund')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(256);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
        return;
      }
      case BTN_DELETE_ID: {
        if (!isTeam(interaction.member)) {
          await interaction.reply({ content: '```Kein Teammitglied```', ephemeral: true, allowedMentions: { parse: [] } });
          return;
        }
        const confirmBtn = new ButtonBuilder()
          .setCustomId(BTN_DELETE_CONFIRM_ID)
          .setLabel('Bestätigen')
          .setStyle(ButtonStyle.Danger);
        const row = new ActionRowBuilder().addComponents(confirmBtn);
        await interaction.reply({ content: '```Löschen```', components: [row], ephemeral: true, allowedMentions: { parse: [] } });
        return;
      }
      case BTN_DELETE_CONFIRM_ID: {
        await interaction.update({ content: '```Löschen```', components: [], ephemeral: true, allowedMentions: { parse: [] } }).catch(() => {});
        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        return;
      }
      default:
        return;
    }
  }

  if (interaction.isModalSubmit() && interaction.customId === MODAL_REOPEN_ID) {
    const reason = interaction.fields.getTextInputValue(MODAL_REOPEN_REASON_ID);
    let startMsg;
    try {
      const messages = await interaction.channel.messages.fetch({ limit: 20 });
      startMsg = messages.find((m) =>
        m.author.id === client.user.id &&
        m.components.some((row) => row.components.some((c) => [BTN_CLAIM_ID, BTN_CLOSE_ID, BTN_REOPEN_ID].includes(c.customId)))
      );
    } catch {}
    try { await interaction.channel.setParent(TICKET_ACTIVE_CATEGORY_ID); } catch {}
    await setStatusPrefix(interaction.channel, '');
    if (startMsg) {
      const embed = EmbedBuilder.from(startMsg.embeds[0]);
      embed.data.fields = embed.data.fields.map((f) =>
        f.name === 'Status' ? { ...f, value: 'Unclaimed | Nicht übernommen' } : f
      );
      const claimBtn = new ButtonBuilder().setCustomId(BTN_CLAIM_ID).setLabel('Claim').setStyle(ButtonStyle.Success);
      const closeBtn = new ButtonBuilder().setCustomId(BTN_CLOSE_ID).setLabel('Close').setStyle(ButtonStyle.Danger);
      const row = new ActionRowBuilder().addComponents(claimBtn, closeBtn);
      await startMsg.edit({ embeds: [embed], components: [row], allowedMentions: { parse: [] } });
    }
    const info = new EmbedBuilder()
      .setDescription(`Ticket reopened | Ticket wieder eröffnet — Reason/Grund: ${reason}`)
      .setFooter(FOOTER);
    await interaction.channel.send({
      content: `<@${interaction.user.id}>`,
      embeds: [info],
      allowedMentions: { users: [interaction.user.id], parse: [] },
    });
    await interaction.deferReply({ ephemeral: true });
    await interaction.deleteReply().catch(() => {});
    return;
  }
}
