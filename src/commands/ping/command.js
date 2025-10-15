/*
### Zweck: Slash-Command /ping – zeigt Ping, Roundtrip, Uptime und Serverzeit als Embed.
*/
import { coreEmbed } from '../../util/embeds/core.js';
import { BRAND_NAME } from '../../util/embeds/brand.js';
import { detectLangFromInteraction } from '../../util/embeds/lang.js';

export default {
  name: 'ping',
  description: 'Show bot and API latency',
  async execute(interaction, client) {
    const start = Date.now();
    await interaction.deferReply();
    const roundtrip = Date.now() - start;

    const uptimeMs = client.uptime ?? 0;
    const uptime = formatDuration(uptimeMs);

    const embed = coreEmbed('ANN', detectLangFromInteraction(interaction))
      .setTitle(`🟢 ${BRAND_NAME} — Status`)
      .setDescription('✅ Operational.')
      .addFields(
        { name: '📡 WebSocket Ping', value: `${Math.round(client.ws.ping)} ms`, inline: true },
        { name: '⏱️ Roundtrip', value: `${roundtrip} ms`, inline: true },
        { name: '⏳ Uptime', value: uptime, inline: true },
        { name: '🕒 Server Time', value: new Date().toISOString(), inline: false }
      );

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

