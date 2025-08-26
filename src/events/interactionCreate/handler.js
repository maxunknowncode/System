import { EmbedBuilder } from 'discord.js';
import { FOOTER } from '../../util/footer.js';
import { VERIFY_BUTTON_ID, VERIFY_ROLE_ID } from '../../features/verify/config.js';

export default {
  name: 'interactionCreate',
  once: false,
  async execute(interaction, client) {
    if (interaction.isButton() && interaction.customId === VERIFY_BUTTON_ID) {
      console.log(`[verify] ${interaction.user.tag} clicked verify`);
      const member = interaction.member ?? await interaction.guild.members.fetch(interaction.user.id);
      try {
        if (!member.roles.cache.has(VERIFY_ROLE_ID)) {
          await member.roles.add(VERIFY_ROLE_ID);
        }
      } catch (err) {
        console.error('[verify] Failed to add role:', err);
      }
      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setDescription('You are now verified!\nDu bist jetzt verifiziert!')
        .setFooter(FOOTER);
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ embeds: [embed] });
        } else {
          await interaction.reply({ embeds: [embed], ephemeral: true });
        }
      } catch (err) {
        console.error('[interaction] Failed to send verify reply:', err);
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands?.get(interaction.commandName);
    if (!command) {
      console.warn(`[interaction] Unknown command: ${interaction.commandName}`);
      const payload = { content: 'Unknown command.' };
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(payload);
        } else {
          await interaction.reply({ ...payload, ephemeral: true });
        }
      } catch (err) {
        console.error('[interaction] Failed to send unknown command reply:', err);
      }
      return;
    }

    try {
      if (typeof command.execute === 'function') {
        await command.execute(interaction, client);
      }
    } catch (error) {
      console.error('[interaction] Command execution error:', error);
      const payload = { content: 'An error occurred while executing this command.' };
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(payload);
        } else {
          await interaction.reply({ ...payload, ephemeral: true });
        }
      } catch (err) {
        console.error('[interaction] Failed to send error reply:', err);
      }
    }
  },
};

