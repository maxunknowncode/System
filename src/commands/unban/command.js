import { ApplicationCommandOptionType, MessageFlags, PermissionsBitField } from 'discord.js';
import { randomUUID } from 'node:crypto';
import { coreEmbed } from '../../util/embeds/core.js';
import { detectLangFromInteraction } from '../../util/embeds/lang.js';
import { ACTION } from '../../modules/moderation/constants.js';
import { createCase } from '../../modules/moderation/storage/repo.js';
import { buildReasonsSelect } from '../../modules/moderation/ui/reasonsSelect.js';
import { buildConfirmButtons } from '../../modules/moderation/ui/confirmButtons.js';
import { hasTeamRole } from '../../modules/moderation/service/exec.js';

export default {
  name: 'unban',
  description: 'Unban a user',
  dmPermission: false,
  options: [
    {
      name: 'user',
      description: 'ID of the user to unban',
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],
  async execute(interaction) {
    if (!interaction.guild || interaction.guild.id !== process.env.GUILD_ID) {
      return;
    }

    const lang = detectLangFromInteraction(interaction) ?? 'en';
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const embed = coreEmbed('ANN', lang);

    if (!hasTeamRole(interaction.member)) {
      embed.setDescription(
        lang === 'de' ? 'Keine Berechtigung (Team-Rolle erforderlich).' : 'Missing permission (team role required).'
      );
      await interaction.editReply({ embeds: [embed], components: [] });
      return;
    }

    if (!interaction.member.permissions?.has(PermissionsBitField.Flags.BanMembers)) {
      embed.setDescription(
        lang === 'de' ? 'Dir fehlt die Berechtigung BAN_MEMBERS.' : 'You lack the BAN_MEMBERS permission.'
      );
      await interaction.editReply({ embeds: [embed], components: [] });
      return;
    }

    const rawId = interaction.options.getString('user', true);
    const userId = rawId.replace(/[^0-9]/g, '');
    if (!userId) {
      embed.setDescription(lang === 'de' ? 'Bitte gib eine gültige ID an.' : 'Please provide a valid ID.');
      await interaction.editReply({ embeds: [embed], components: [] });
      return;
    }

    if (userId === interaction.user.id) {
      embed.setDescription(lang === 'de' ? 'Du kannst dich nicht selbst entbannen.' : 'You cannot unban yourself.');
      await interaction.editReply({ embeds: [embed], components: [] });
      return;
    }

    if (interaction.client.user && userId === interaction.client.user.id) {
      embed.setDescription(lang === 'de' ? 'Der Bot kann nicht Ziel dieser Aktion sein.' : 'The bot cannot be targeted.');
      await interaction.editReply({ embeds: [embed], components: [] });
      return;
    }

    const fetchedUser = await interaction.client.users.fetch(userId).catch(() => null);
    if (fetchedUser?.bot) {
      embed.setDescription(
        lang === 'de' ? 'Bots werden nicht automatisch entbannt.' : 'Bots cannot be unbanned with this command.'
      );
      await interaction.editReply({ embeds: [embed], components: [] });
      return;
    }

    const caseId = randomUUID();
    await createCase({
      id: caseId,
      guildId: interaction.guild.id,
      userId,
      moderatorId: interaction.user.id,
      actionType: ACTION.UNBAN,
    });

    const reasonRow = buildReasonsSelect(caseId, lang);
    const confirmRow = buildConfirmButtons(ACTION.UNBAN, caseId, lang);

    embed.setDescription(
        lang === 'de'
          ? `Bitte bestätige die Entbannung für <@${userId}> (Case #${caseId}).`
          : `Configure the unban for <@${userId}> (Case #${caseId}).`
      )
      .addFields({
        name: lang === 'de' ? 'Ziel' : 'Target',
        value: fetchedUser ? `<@${userId}> (${fetchedUser.tag ?? userId})` : `<@${userId}> (${userId})`,
      });

    await interaction.editReply({
      embeds: [embed],
      components: [reasonRow, confirmRow],
    });
  },
};
