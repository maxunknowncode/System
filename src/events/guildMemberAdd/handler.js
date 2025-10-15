/*
### Zweck: Reagiert auf neue Mitglieder und sendet eine Willkommensnachricht.
*/
import { Events } from 'discord.js';
import { coreEmbed } from '../../util/embeds/core.js';
import { BRAND_NAME } from '../../util/embeds/brand.js';
import { detectLangFromInteraction } from '../../util/embeds/lang.js';
import { logger } from '../../util/logging/logger.js';
import {
  WELCOME_CHANNEL_ID,
  RULES_CHANNEL_ID,
  WELCOME_IMAGE_URL,
} from '../../modules/welcome/config.js';

const welcomeLogger = logger.withPrefix('welcome');

export default {
  name: Events.GuildMemberAdd,
  once: false,
  async execute(member) {
    const channel = member.guild?.channels.cache.get(WELCOME_CHANNEL_ID);
    if (!channel) return;

    const description = `> Hello ${member}, welcome to **${BRAND_NAME}**.\n\n> Please read the rules in channel <#${RULES_CHANNEL_ID}>!`;

    const lang = detectLangFromInteraction(member);

    const embed = coreEmbed('WELCOME', lang)
      .setTitle('Welcome!')
      .setDescription(description)
      .setThumbnail(WELCOME_IMAGE_URL);

    try {
      await channel.send({ embeds: [embed] });
    } catch (err) {
      welcomeLogger.warn('Nachricht konnte nicht gesendet werden:', err);
    }
  },
};
