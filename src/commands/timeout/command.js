import { ApplicationCommandOptionType, MessageFlags, PermissionsBitField } from 'discord.js';
import { randomUUID } from 'node:crypto';
import { coreEmbed } from '../../util/embeds/core.js';
import { detectLangFromInteraction } from '../../util/embeds/lang.js';
import { ACTION } from '../../modules/moderation/constants.js';
import { createCase } from '../../modules/moderation/storage/repo.js';
import { buildDurationSelect } from '../../modules/moderation/ui/durationSelect.js';
import { buildReasonsSelect } from '../../modules/moderation/ui/reasonsSelect.js';
import { buildConfirmButtons } from '../../modules/moderation/ui/confirmButtons.js';
import { compareBotHierarchy, compareHierarchy, hasTeamRole } from '../../modules/moderation/service/exec.js';

export default {
  name: 'timeout',
  description: 'Timeout a member',
  dmPermission: false,
  options: [
    {
      name: 'target',
      description: 'Member to timeout',
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
      embed.setDescription(lang === 'de' ? 'Keine Berechtigung (Team-Rolle erforderlich).' : 'Missing permission (team role required).');
      await interaction.editReply({ embeds: [embed], components: [] });
      return;
    }

    if (!interaction.member.permissions?.has(PermissionsBitField.Flags.ModerateMembers)) {
      embed.setDescription(lang === 'de' ? 'Dir fehlt die Berechtigung MODERATE_MEMBERS.' : 'You lack the MODERATE_MEMBERS permission.');
      await interaction.editReply({ embeds: [embed], components: [] });
      return;
    }

    const targetUser = interaction.options.getUser('target', true);
    if (!targetUser) {
      embed.setDescription(lang === 'de' ? 'Ziel konnte nicht gelesen werden.' : 'Target user unavailable.');
      await interaction.editReply({ embeds: [embed], components: [] });
      return;
    }

    if (targetUser.id === interaction.user.id) {
      embed.setDescription(lang === 'de' ? 'Du kannst dich nicht selbst timeouten.' : 'You cannot timeout yourself.');
      await interaction.editReply({ embeds: [embed], components: [] });
      return;
    }

    if (targetUser.bot) {
      embed.setDescription(lang === 'de' ? 'Bots können nicht getimeoutet werden.' : 'Bots cannot be timed out.');
      await interaction.editReply({ embeds: [embed], components: [] });
      return;
    }

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (hasTeamRole(targetMember)) {
      embed.setDescription(lang === 'de' ? 'Aktion blockiert: Ziel gehört zum Team.' : 'Action blocked: target is part of the team.');
      await interaction.editReply({ embeds: [embed], components: [] });
      return;
    }

    if (targetMember && !compareHierarchy(interaction.member, targetMember)) {
      embed.setDescription(lang === 'de' ? 'Rollen-Hierarchie verhindert diese Aktion.' : 'Role hierarchy prevents this action.');
      await interaction.editReply({ embeds: [embed], components: [] });
      return;
    }

    if (targetMember && !compareBotHierarchy(interaction.guild, targetMember)) {
      embed.setDescription(lang === 'de' ? 'Bot-Rolle nicht hoch genug.' : 'Bot role hierarchy too low.');
      await interaction.editReply({ embeds: [embed], components: [] });
      return;
    }

    const caseId = randomUUID();
    await createCase({
      id: caseId,
      guildId: interaction.guild.id,
      userId: targetUser.id,
      moderatorId: interaction.user.id,
      actionType: ACTION.TIMEOUT,
    });

    const durationRow = buildDurationSelect(ACTION.TIMEOUT, caseId, lang);
    const reasonRow = buildReasonsSelect(caseId, lang);
    const confirmRow = buildConfirmButtons(ACTION.TIMEOUT, caseId, lang);

    embed.setDescription(
        lang === 'de'
          ? `Bitte konfiguriere den Timeout für <@${targetUser.id}> (Case #${caseId}).`
          : `Configure the timeout for <@${targetUser.id}> (Case #${caseId}).`
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
