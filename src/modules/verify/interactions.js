/*
### Zweck: Handhabt Verify- und Sprachwechsel-Buttons.
*/
import { EmbedBuilder } from 'discord.js';
import {
  VERIFY_ROLE_ID,
  VERIFY_BUTTON_ID,
  VERIFY_LANG_EN_ID,
  VERIFY_LANG_DE_ID,
  VERIFY_RESET_MS,
} from './config.js';
import { buildVerifyEmbedAndComponents } from './embed.js';
import { FOOTER } from '../../util/footer.js';
import { logger } from '../../util/logger.js';

const verifyLangTimers = new Map();

export async function handleVerifyInteractions(interaction, client) {
  if (interaction.customId === VERIFY_BUTTON_ID) {
    const member =
      interaction.member ??
      (await interaction.guild.members.fetch(interaction.user.id).catch(() => null));
    if (!member) {
      const embed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('Verification')
        .setDescription('⚠️ Verification failed. Please try again or contact staff.')
        .setFooter(FOOTER);
      try {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      } catch {}
      logger.warn('[verify] Mitglied nicht gefunden');
      return;
    }

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
      logger.warn('[verify] Rolle konnte nicht vergeben', err);
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

  if (
    interaction.customId === VERIFY_LANG_EN_ID ||
    interaction.customId === VERIFY_LANG_DE_ID
  ) {
    const lang = interaction.customId === VERIFY_LANG_DE_ID ? 'de' : 'en';
    try {
      await interaction.update(buildVerifyEmbedAndComponents(lang));
      logger.info(`[verify] Sprache → ${lang.toUpperCase()}`);
    } catch (err) {
      logger.error('[verify] Fehler beim Umschalten der Sprache:', err);
      return;
    }

    const messageId = interaction.message.id;
    if (verifyLangTimers.has(messageId)) {
      clearTimeout(verifyLangTimers.get(messageId));
    }
    const timeout = setTimeout(async () => {
      try {
        await interaction.message.edit(buildVerifyEmbedAndComponents('en'));
        logger.info('[verify] Sprache → EN (Timeout)');
      } catch (err) {
        logger.error('[verify] Fehler beim Zurücksetzen der Sprache:', err);
      }
      verifyLangTimers.delete(messageId);
    }, VERIFY_RESET_MS);
    verifyLangTimers.set(messageId, timeout);
  }
}
