/*
### Zweck: Handhabt Verify- und Sprachwechsel-Buttons.
*/
import {
  VERIFY_ROLE_ID,
  VERIFY_BUTTON_ID,
  VERIFY_LANG_EN_ID,
  VERIFY_LANG_DE_ID,
  VERIFY_RESET_MS,
} from './config.js';
import { buildVerifyEmbedAndComponents } from './embed.js';
import { coreEmbed } from '../../util/embeds/core.js';
import { detectLangFromInteraction } from '../../util/embeds/lang.js';
import { logger } from '../../util/logging/logger.js';

const verifyLogger = logger.withPrefix('verify');

const verifyLangTimers = new Map();

export async function handleVerifyInteractions(interaction, client) {
  const lang = detectLangFromInteraction(interaction);

  if (interaction.customId === VERIFY_BUTTON_ID) {
    const member =
      interaction.member ??
      (await interaction.guild.members.fetch(interaction.user.id).catch(() => null));
    if (!member) {
      const embed = coreEmbed('VERIFY', lang)
        .setColor(0xFFA500)
        .setTitle('Verification')
        .setDescription('⚠️ Verification failed. Please try again or contact staff.');
      try {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      } catch (err) {
        verifyLogger.error('Antwort konnte nicht gesendet werden:', err);
      }
      verifyLogger.warn('Mitglied nicht gefunden');
      return;
    }

    if (member.roles.cache.has(VERIFY_ROLE_ID)) {
      const embed = coreEmbed('VERIFY', lang)
        .setColor(0x00ff00)
        .setTitle('Verification')
        .setDescription('ℹ️ You are already verified.');
      try {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      } catch (err) {
        verifyLogger.error('Antwort konnte nicht gesendet werden:', err);
      }
      return;
    }

    try {
      await member.roles.add(VERIFY_ROLE_ID);
      const embed = coreEmbed('VERIFY', lang)
        .setColor(0x00ff00)
        .setTitle('Verification')
        .setDescription('✅ You are now verified!');
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (err) {
      verifyLogger.warn('Rolle konnte nicht vergeben', err);
      const embed = coreEmbed('VERIFY', lang)
        .setColor(0xFFA500)
        .setTitle('Verification')
        .setDescription('⚠️ Verification failed. Please try again or contact staff.');
      try {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      } catch (err) {
        verifyLogger.error('Antwort konnte nicht gesendet werden:', err);
      }
    }
    return;
  }

  if (
    interaction.customId === VERIFY_LANG_EN_ID ||
    interaction.customId === VERIFY_LANG_DE_ID
  ) {
    const lang = interaction.customId === VERIFY_LANG_DE_ID ? 'de' : 'en';
    try {
      await interaction.update({
        ...buildVerifyEmbedAndComponents(lang),
        allowedMentions: { parse: [] },
      });
      verifyLogger.info(`Sprache → ${lang.toUpperCase()}`);
    } catch (err) {
      verifyLogger.error('Fehler beim Umschalten der Sprache:', err);
      return;
    }

    const messageId = interaction.message.id;
    if (verifyLangTimers.has(messageId)) {
      clearTimeout(verifyLangTimers.get(messageId));
    }
    const timeout = setTimeout(async () => {
      try {
        await interaction.message.edit({
          ...buildVerifyEmbedAndComponents('en'),
          allowedMentions: { parse: [] },
        });
        verifyLogger.info('Sprache → EN (Timeout)');
      } catch (err) {
        verifyLogger.error('Fehler beim Zurücksetzen der Sprache:', err);
      }
      verifyLangTimers.delete(messageId);
    }, VERIFY_RESET_MS);
    verifyLangTimers.set(messageId, timeout);
  }
}
