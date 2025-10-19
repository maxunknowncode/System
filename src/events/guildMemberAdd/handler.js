/*
### Zweck: Reagiert auf neue Mitglieder und sendet eine Willkommensnachricht.
*/
import { Events } from 'discord.js';
import { brandTitle, coreEmbed } from '../../util/embeds/core.js';
import { BRAND_NAME } from '../../config/branding.js';
import { detectLangFromInteraction } from '../../util/embeds/lang.js';
import { logger } from '../../util/logging/logger.js';
import {
  WELCOME_CHANNEL_ID,
  RULES_CHANNEL_ID,
  WELCOME_IMAGE_URL,
} from '../../modules/welcome/config.js';
import { WELCOME_MESSAGES, resolveText } from '../../i18n/messages.js';

const welcomeLogger = logger.withPrefix('welcome:handler');

export default {
  name: Events.GuildMemberAdd,
  once: false,
  async execute(member) {
    const channel = member.guild?.channels.cache.get(WELCOME_CHANNEL_ID);
    if (!channel) return;

    const lang = detectLangFromInteraction(member);

    const embed = coreEmbed('WELCOME', lang)
      .setTitle(brandTitle(resolveText(WELCOME_MESSAGES.title, lang)))
      .setDescription(
        resolveText(WELCOME_MESSAGES.description, lang, {
          member: member.toString(),
          brand: BRAND_NAME,
          rulesChannelId: RULES_CHANNEL_ID,
        })
      )
      .setThumbnail(WELCOME_IMAGE_URL);

    try {
      await channel.send({ embeds: [embed] });
    } catch (err) {
      welcomeLogger.warn('Nachricht konnte nicht gesendet werden:', err);
    }
  },
};
