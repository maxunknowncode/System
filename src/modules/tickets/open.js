import { BTN_CLAIM_ID, BTN_CLOSE_ID, TEAM_ROLE_ID, TICKET_ACTIVE_CATEGORY_ID } from './config.js';
import { buildTicketName } from './utils.js';
import { FOOTER } from '../../util/footer.js';
import { applyAuthor } from '../../util/author.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionsBitField,
} from 'discord.js';

export async function openTicket(interaction, lang = 'en') {
  const { guild, user } = interaction;
  const categoryId = TICKET_ACTIVE_CATEGORY_ID;
  if (!categoryId) {
    await interaction.reply({ content: 'Fehler', ephemeral: true, allowedMentions: { parse: [] } });
    return;
  }

  let name = buildTicketName(user);
  if (guild.channels.cache.some((c) => c.name === name)) {
    name += `-${Math.floor(Math.random() * 9000) + 1000}`;
  }

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
    {
      id: user.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.AttachFiles,
      ],
    },
    {
      id: TEAM_ROLE_ID,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
      ],
    },
    {
      id: guild.members.me.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ManageChannels,
        PermissionsBitField.Flags.ReadMessageHistory,
      ],
    },
  ];

  let channel;
  try {
    channel = await guild.channels.create({
      name,
      parent: categoryId,
      type: ChannelType.GuildText,
      permissionOverwrites: overwrites,
    });
  } catch {
    await interaction.reply({ content: 'Fehler', ephemeral: true, allowedMentions: { parse: [] } });
    return;
  }

  const ticketChannel = channel.toString();
  const replyEmbed = new EmbedBuilder()
    .setTitle(lang === 'de' ? 'Erfolgreich – Ticket erstellt' : 'Successfully - Ticket Created')
    .setDescription(
      lang === 'de'
        ? `Ticket erstellt. Hier ist dein Ticket: ${ticketChannel}`
        : `Ticket created. Here is your ticket: ${ticketChannel}`
    )
    .setFooter(FOOTER);
  await interaction.reply({ embeds: [replyEmbed], ephemeral: true, allowedMentions: { parse: [] } });

  const embed = applyAuthor(new EmbedBuilder(), 'TICKET').setDescription(
    lang === 'de'
      ? '> 🇩🇪 Bitte beschreibe dein Anliegen, während du wartest.'
      : "> 🇺🇸 Please describe your issue while you’re waiting."
  );

  const claimBtn = new ButtonBuilder()
    .setCustomId(BTN_CLAIM_ID)
    .setEmoji('✅')
    .setStyle(ButtonStyle.Success)
    .setLabel('Claim');

  const closeBtn = new ButtonBuilder()
    .setCustomId(BTN_CLOSE_ID)
    .setEmoji('🔒')
    .setStyle(ButtonStyle.Danger)
    .setLabel('Close');

  const row = new ActionRowBuilder().addComponents(claimBtn, closeBtn);

  await channel.send({
    content: `<@${user.id}> <@&${TEAM_ROLE_ID}>`,
    embeds: [embed],
    components: [row],
    allowedMentions: { users: [user.id], roles: [TEAM_ROLE_ID], parse: [] },
  });
}
