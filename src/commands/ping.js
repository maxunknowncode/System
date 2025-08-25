import { EmbedBuilder } from 'discord.js';
import { FOOTER } from '../util/footer.js';

export default {
  name: 'ping',
  description: 'Show bot and API latency',
  async execute(interaction, client) {
    const start = Date.now();
    await interaction.deferReply({ ephemeral: false });
    const roundtrip = Date.now() - start;

    const uptimeMs = client.uptime ?? 0;
    const uptime = formatDuration(uptimeMs);

    const embed = new EmbedBuilder()
      .setTitle('🟢 The Core System — Status')
      .setDescription('✅ Operational.')
      .addFields(
        { name: '📡 WebSocket Ping', value: `${Math.round(client.ws.ping)} ms`, inline: true },
        { name: '⏱️ Roundtrip', value: `${roundtrip} ms`, inline: true },
        { name: '⏳ Uptime', value: uptime, inline: true },
        { name: '🕒 Server Time', value: new Date().toISOString(), inline: false }
      )
      .setColor(0xFFD700)
      .setFooter(FOOTER);

    await interaction.editReply({ embeds: [embed] });
  },
};

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

