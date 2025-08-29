import { EmbedBuilder } from 'discord.js';
import { FOOTER } from '../../util/footer.js';
import { VERIFY_BUTTON_ID, VERIFY_ROLE_ID } from '../../features/verify/config.js';
import { logger } from '../../util/logger.js';

export default {
  name: 'interactionCreate',
  once: false,
  async execute(interaction, client) {
    if (interaction.isButton() && interaction.customId === VERIFY_BUTTON_ID) {
        const member = interaction.member ?? await interaction.guild.members.fetch(interaction.user.id);

        if (member.roles.cache.has(VERIFY_ROLE_ID)) {
          const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('Verification')
            .setDescription('ℹ️ You are already verified.')
            .setFooter(FOOTER);
          try {
            await interaction.reply({ embeds: [embed], ephemeral: true });
          } catch {}
          return;
        }

        try {
          await member.roles.add(VERIFY_ROLE_ID);
          const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('Verification')
            .setDescription('✅ You are now verified!')
            .setFooter(FOOTER);
          await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (err) {
          logger.warn('[verifizierung] Rolle konnte nicht vergeben werden: Missing Permissions');
          const embed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('Verification')
            .setDescription('⚠️ Verification failed. Please try again or contact staff.')
            .setFooter(FOOTER);
          try {
            await interaction.reply({ embeds: [embed], ephemeral: true });
          } catch {}
        }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

      const command = client.commands?.get(interaction.commandName);
      if (!command) {
        const payload = { content: 'Unknown command.' };
        try {
          if (interaction.deferred || interaction.replied) {
            await interaction.editReply(payload);
          } else {
            await interaction.reply({ ...payload, ephemeral: true });
          }
        } catch {}
        return;
      }

    try {
      if (typeof command.execute === 'function') {
        await command.execute(interaction, client);
      }
      } catch (error) {
        logger.error('[befehle] Ausführung fehlgeschlagen:', error);
        const payload = { content: 'An error occurred while executing this command.' };
        try {
          if (interaction.deferred || interaction.replied) {
            await interaction.editReply(payload);
          } else {
            await interaction.reply({ ...payload, ephemeral: true });
          }
        } catch {}
      }
    },
  };

