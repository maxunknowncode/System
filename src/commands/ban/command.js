import { ApplicationCommandOptionType, MessageFlags, PermissionsBitField } from 'discord.js';
import { randomUUID } from 'node:crypto';
import { coreEmbed } from '../../util/embeds/core.js';
import { detectLangFromInteraction } from '../../util/embeds/lang.js';
import { ACTION, ERROR_COLOR } from '../../modules/moderation/constants.js';
import { createCase } from '../../modules/moderation/storage/repo.js';
import { buildDurationSelect } from '../../modules/moderation/ui/durationSelect.js';
import { buildReasonsSelect } from '../../modules/moderation/ui/reasonsSelect.js';
import { buildConfirmButtons } from '../../modules/moderation/ui/confirmButtons.js';
import { compareBotHierarchy, compareHierarchy, hasTeamRole } from '../../modules/moderation/service/exec.js';

export default {
  name: 'ban',
  description: 'Ban a member from the guild',
  dmPermission: false,
  options: [
    {
      name: 'target',
      description: 'Member to ban',
      type: ApplicationCommandOptionType.User,
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
      embed
        .setColor(ERROR_COLOR)
        .setDescription(lang === 'de' ? 'Keine Berechtigung (Team-Rolle erforderlich).' : 'Missing permission (team role required).');
      await interaction.editReply({ embeds: [embed], components: [] });
      return;
    }

    if (!interaction.member.permissions?.has(PermissionsBitField.Flags.BanMembers)) {
      embed
        .setColor(ERROR_COLOR)
        .setDescription(lang === 'de' ? 'Dir fehlt die Berechtigung BAN_MEMBERS.' : 'You lack the BAN_MEMBERS permission.');
      await interaction.editReply({ embeds: [embed], components: [] });
      return;
    }

    const targetUser = interaction.options.getUser('target', true);
    if (!targetUser) {
      embed
        .setColor(ERROR_COLOR)
        .setDescription(lang === 'de' ? 'Ziel konnte nicht gelesen werden.' : 'Target user unavailable.');
      await interaction.editReply({ embeds: [embed], components: [] });
      return;
    }

    if (targetUser.id === interaction.user.id) {
      embed
        .setColor(ERROR_COLOR)
        .setDescription(lang === 'de' ? 'Du kannst dich nicht selbst bannen.' : 'You cannot ban yourself.');
      await interaction.editReply({ embeds: [embed], components: [] });
      return;
    }

    if (targetUser.bot) {
      embed
        .setColor(ERROR_COLOR)
        .setDescription(lang === 'de' ? 'Bots können nicht gebannt werden.' : 'Bots cannot be banned.');
      await interaction.editReply({ embeds: [embed], components: [] });
      return;
    }

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (hasTeamRole(targetMember)) {
      embed
        .setColor(ERROR_COLOR)
        .setDescription(lang === 'de' ? 'Aktion blockiert: Ziel gehört zum Team.' : 'Action blocked: target is part of the team.');
      await interaction.editReply({ embeds: [embed], components: [] });
      return;
    }

    if (targetMember && !compareHierarchy(interaction.member, targetMember)) {
      embed
        .setColor(ERROR_COLOR)
        .setDescription(lang === 'de' ? 'Rollen-Hierarchie verhindert diese Aktion.' : 'Role hierarchy prevents this action.');
      await interaction.editReply({ embeds: [embed], components: [] });
      return;
    }

    if (targetMember && !compareBotHierarchy(interaction.guild, targetMember)) {
      embed
        .setColor(ERROR_COLOR)
        .setDescription(lang === 'de' ? 'Bot-Rolle nicht hoch genug.' : 'Bot role hierarchy too low.');
      await interaction.editReply({ embeds: [embed], components: [] });
      return;
    }

    const caseId = randomUUID();
    await createCase({
      id: caseId,
      guildId: interaction.guild.id,
      userId: targetUser.id,
      moderatorId: interaction.user.id,
      actionType: ACTION.BAN,
    });

    const durationRow = buildDurationSelect(ACTION.BAN, caseId, lang);
    const reasonRow = buildReasonsSelect(caseId, lang);
    const confirmRow = buildConfirmButtons(ACTION.BAN, caseId, lang);

    embed
      .setDescription(
        lang === 'de'
          ? `Bitte konfiguriere den Bann für <@${targetUser.id}> (Case #${caseId}).`
          : `Configure the ban for <@${targetUser.id}> (Case #${caseId}).`
      )
      .addFields({
        name: lang === 'de' ? 'Ziel' : 'Target',
        value: `<@${targetUser.id}> (${targetUser.tag ?? targetUser.id})`,
      });

    await interaction.editReply({
      embeds: [embed],
      components: [durationRow, reasonRow, confirmRow],
    });
  },
};
