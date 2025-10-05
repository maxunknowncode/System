import { ApplicationCommandOptionType } from 'discord.js';
import { randomUUID } from 'node:crypto';
import { coreEmbed } from '../../util/embeds/core.js';
import { detectLangFromInteraction } from '../../util/embeds/lang.js';
import { TEAM_ROLE_ID } from '../../modules/moderation/config.js';
import { ACTION, ERROR_COLOR } from '../../modules/moderation/constants.js';
import { createCase } from '../../modules/moderation/storage/repo.js';
import { buildReasonsSelect } from '../../modules/moderation/ui/reasonsSelect.js';
import { buildConfirmButtons } from '../../modules/moderation/ui/confirmButtons.js';

export default {
  name: 'kick',
  description: 'Kick a member from the guild',
  dmPermission: false,
  options: [
    {
      name: 'target',
      description: 'Member to kick',
      type: ApplicationCommandOptionType.User,
      required: true,
    },
  ],
  async execute(interaction) {
    if (!interaction.guild || interaction.guild.id !== process.env.GUILD_ID) {
      return;
    }

    const lang = detectLangFromInteraction(interaction);
    const embed = coreEmbed('ANN', lang);

    if (!interaction.member?.roles?.cache?.has(TEAM_ROLE_ID)) {
      embed
        .setColor(ERROR_COLOR)
        .setDescription(lang === 'de' ? 'Du benötigst die Team-Rolle.' : 'You need the team role.');
      await interaction.reply({ ephemeral: true, embeds: [embed] });
      return;
    }

    const target = interaction.options.getUser('target', true);
    const caseId = randomUUID();
    await createCase({
      id: caseId,
      guildId: interaction.guild.id,
      userId: target.id,
      moderatorId: interaction.user.id,
      actionType: ACTION.KICK,
    });

    const reasonRow = buildReasonsSelect(caseId, lang);
    const confirmRow = buildConfirmButtons(ACTION.KICK, caseId, lang);

    embed
      .setDescription(
        lang === 'de'
          ? `Bitte bestätige den Kick für <@${target.id}> (Case #${caseId}).`
          : `Configure the kick for <@${target.id}> (Case #${caseId}).`
      )
      .addFields({
        name: lang === 'de' ? 'Ziel' : 'Target',
        value: `<@${target.id}> (${target.tag ?? target.id})`,
      });

    await interaction.reply({
      ephemeral: true,
      embeds: [embed],
      components: [reasonRow, confirmRow],
    });
  },
};
