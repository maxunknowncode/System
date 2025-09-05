import {
  BTN_CLAIM_ID,
  BTN_CLOSE_ID,
  TEAM_ROLE_ID,
  TICKET_ACTIVE_CATEGORY_ID,
} from './config.js';
import { buildTicketName } from './utils.js';
import { FOOTER } from '../../util/footer.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionsBitField,
} from 'discord.js';

export async function openTicket(interaction) {
  const { guild, user } = interaction;
  const categoryId = TICKET_ACTIVE_CATEGORY_ID;
  if (!categoryId) {
    await interaction.editReply('```Fehler```');
    return false;
  }

  let name = buildTicketName(user);
  if (guild.channels.cache.some((c) => c.name === name)) {
    name += `-${Math.floor(Math.random() * 9000) + 1000}`;
  }

  const overwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionsBitField.Flags.ViewChannel],
    },
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
    await interaction.editReply('```Fehler```');
    return false;
  }

  const embed = new EmbedBuilder()
    .setTitle('🧾 Support Ticket | Support-Ticket')
    .setDescription(
      `**English**\n• A team member will assist you shortly.\n\n**Deutsch**\n• Ein Teammitglied kümmert sich in Kürze.`
    )
    .addFields(
      { name: 'Status', value: 'Unclaimed / Nicht übernommen' },
      { name: 'Created by', value: `<@${user.id}>` }
    )
    .setFooter(FOOTER);

  const claimBtn = new ButtonBuilder()
    .setCustomId(BTN_CLAIM_ID)
    .setLabel('Claim')
    .setStyle(ButtonStyle.Success)
    .setEmoji('✅');

  const closeBtn = new ButtonBuilder()
    .setCustomId(BTN_CLOSE_ID)
    .setLabel('Close')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('🔴');

  const row = new ActionRowBuilder().addComponents(claimBtn, closeBtn);

  await channel.send({
    content: `<@${user.id}> <@&${TEAM_ROLE_ID}>`,
    embeds: [embed],
    components: [row],
    allowedMentions: { users: [user.id], roles: [TEAM_ROLE_ID], parse: [] },
  });

  return true;
}
