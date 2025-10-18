import {
  BTN_CLAIM_ID,
  BTN_CLOSE_ID,
  TEAM_ROLE_ID,
  TICKET_ACTIVE_CATEGORY_ID,
  TICKET_CHANNEL_PREFIX,
} from './config.js';
import { buildTicketName } from './utils.js';
import { coreEmbed } from '../../util/embeds/core.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  MessageFlags,
  PermissionsBitField,
} from 'discord.js';
import { TICKET_MESSAGES, resolveText } from '../../i18n/messages.js';
import { logger } from '../../util/logging/logger.js';

const ticketsLogger = logger.withPrefix('tickets:open');

export async function openTicket(interaction, lang = 'en') {
  const { guild, user } = interaction;
  const categoryId = TICKET_ACTIVE_CATEGORY_ID;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
  if (!categoryId) {
    await interaction.editReply({ content: 'Fehler', allowedMentions: { parse: [] } });
    return;
  }
  const existing = guild.channels.cache.filter(
    (c) =>
      c.parentId === TICKET_ACTIVE_CATEGORY_ID && c.name.startsWith(TICKET_CHANNEL_PREFIX)
  );
  const index = Math.min(existing.size + 1, 99);

  let name = buildTicketName(user, index);
  // keine Zufallsnummern mehr nötig

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
  } catch (error) {
    ticketsLogger.error('Kanal konnte nicht erstellt werden:', error);
    await interaction.editReply({ content: 'Fehler', allowedMentions: { parse: [] } });
    return;
  }

  const ticketChannel = channel.toString();
  const replyEmbed = coreEmbed('TICKET', lang)
    .setTitle(resolveText(TICKET_MESSAGES.createdTitle, lang))
    .setDescription(
      resolveText(TICKET_MESSAGES.createdDescription, lang, { ticketChannel })
    );
  await interaction.editReply({ embeds: [replyEmbed], allowedMentions: { parse: [] } });

  const embed = coreEmbed('TICKET', lang).setDescription(
    resolveText(TICKET_MESSAGES.promptDescription, lang)
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
