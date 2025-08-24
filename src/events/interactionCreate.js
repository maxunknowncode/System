export default {
  name: 'interactionCreate',
  once: false,
  async execute(interaction, client) {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands?.get(interaction.commandName);
    if (!command) {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'Unknown command.', ephemeral: true });
      }
      return;
    }

    try {
      if (typeof command.execute === 'function') {
        await command.execute(interaction, client);
      }
    } catch (error) {
      console.error(error);
      const payload = { content: 'An error occurred while executing this command.', ephemeral: true };
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp(payload);
        } else {
          await interaction.reply(payload);
        }
      } catch (err) {
        console.error('Failed to send error reply:', err);
      }
    }
  },
};

