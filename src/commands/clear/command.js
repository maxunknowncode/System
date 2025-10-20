import { ApplicationCommandOptionType, MessageFlags } from 'discord.js';
import { brandTitle, coreEmbed } from '../../util/embeds/core.js';
import { detectLangFromInteraction } from '../../util/embeds/lang.js';
import { hasRole } from '../../util/permissions.js';
import { ROLE_IDS } from '../../config/ids.js';
import { CLEAR_COMMAND_MESSAGES, GENERIC_MESSAGES, resolveText } from '../../i18n/messages.js';

export default {
  name: 'clear',
  description: 'Delete a number of recent messages.',
  options: [
    {
      name: 'amount',
      description: 'Number of messages to delete',
      type: ApplicationCommandOptionType.Integer,
      required: true,
      max_value: 100,
    },
  ],
  async execute(interaction) {
    const amount = interaction.options.getInteger('amount', true);
    const lang = detectLangFromInteraction(interaction);

    if (!hasRole(interaction.member, ROLE_IDS.moderationClear)) {
      const embed = coreEmbed('ANN', lang)
        .setTitle(brandTitle(resolveText(CLEAR_COMMAND_MESSAGES.noPermissionTitle, lang)))
        .setDescription(resolveText(GENERIC_MESSAGES.noPermission, lang));
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    let deleted = 0;
    try {
      const col = await interaction.channel.bulkDelete(amount, true);
      deleted = col.size;
    } catch {
      deleted = 0;
    }

    const embed = coreEmbed('ANN', lang)
      .setTitle(brandTitle(resolveText(CLEAR_COMMAND_MESSAGES.resultTitle, lang)))
      .setDescription(
        resolveText(CLEAR_COMMAND_MESSAGES.resultDescription, lang, {
          deleted,
          channelId: interaction.channel.id,
        })
      );
    await interaction.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
  },
};
