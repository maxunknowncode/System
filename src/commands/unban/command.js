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

    const lang = detectLangFromInteraction(interaction);
    const embed = coreEmbed('ANN', lang);

    if (!interaction.member?.roles?.cache?.has(TEAM_ROLE_ID)) {
      embed
        .setColor(ERROR_COLOR)
        .setDescription(lang === 'de' ? 'Du benötigst die Team-Rolle.' : 'You need the team role.');
      await interaction.reply({ ephemeral: true, embeds: [embed] });
      return;
    }

    const userId = interaction.options.getString('user', true).replace(/[^0-9]/g, '');
    if (!userId) {
      embed
        .setColor(ERROR_COLOR)
        .setDescription(lang === 'de' ? 'Bitte gib eine gültige ID an.' : 'Please provide a valid ID.');
      await interaction.reply({ ephemeral: true, embeds: [embed] });
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

    embed
      .setDescription(
        lang === 'de'
          ? `Bitte bestätige die Entbannung für <@${userId}> (Case #${caseId}).`
          : `Configure the unban for <@${userId}> (Case #${caseId}).`
      )
      .addFields({
        name: lang === 'de' ? 'Ziel' : 'Target',
        value: `<@${userId}> (${userId})`,
      });

    await interaction.reply({
      ephemeral: true,
      embeds: [embed],
      components: [reasonRow, confirmRow],
    });
  },
};
