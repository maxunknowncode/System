import { ApplicationCommandOptionType } from 'discord.js';
import { coreEmbed } from '../../util/embeds/core.js';
import { detectLangFromInteraction } from '../../util/embeds/lang.js';

const ROLE_ID = '1363298860121985215';

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

    if (!interaction.member.roles.cache.has(ROLE_ID)) {
      const embed = coreEmbed('ANN', lang)
        .setTitle('No Permission')
        .setDescription('You do not have permission to use this command.')
        .setColor(0xff0000);
      await interaction.reply({ embeds: [embed], ephemeral: true, allowedMentions: { parse: [] } });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    let deleted = 0;
    try {
      const col = await interaction.channel.bulkDelete(amount, true);
      deleted = col.size;
    } catch {
      deleted = 0;
    }

    const embed = coreEmbed('ANN', lang)
      .setTitle('Messages Cleared')
      .setDescription(`Deleted **${deleted}** messages in <#${interaction.channel.id}>.`)
      .setColor(0x00ff00);
    await interaction.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
  },
};
