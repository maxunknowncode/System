import { EmbedBuilder } from 'discord.js';
import { VERIFY_ROLE_ID } from './config.js';
import { FOOTER } from '../../util/footer.js';
import { logger } from '../../util/logger.js';

export async function handleVerifyButton(interaction, client) {
  const member = interaction.member ?? await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  if (!member) {
    const embed = new EmbedBuilder()
      .setColor(0xFFA500)
      .setTitle('Verification')
      .setDescription('⚠️ Verification failed. Please try again or contact staff.')
      .setFooter(FOOTER);
    try { await interaction.reply({ embeds: [embed], ephemeral: true }); } catch {}
    logger.warn('[verifizierung] Mitglied konnte nicht ermittelt werden');
    return;
  }

  if (member.roles.cache.has(VERIFY_ROLE_ID)) {
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('Verification')
      .setDescription('ℹ️ You are already verified.')
      .setFooter(FOOTER);
    try { await interaction.reply({ embeds: [embed], ephemeral: true }); } catch {}
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
    logger.warn('[verifizierung] Rolle konnte nicht vergeben werden');
    const embed = new EmbedBuilder()
      .setColor(0xFFA500)
      .setTitle('Verification')
      .setDescription('⚠️ Verification failed. Please try again or contact staff.')
      .setFooter(FOOTER);
    try { await interaction.reply({ embeds: [embed], ephemeral: true }); } catch {}
  }
}
