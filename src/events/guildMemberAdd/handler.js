/*
### Zweck: Reagiert auf neue Mitglieder und sendet eine Willkommensnachricht.
*/
import { Events, EmbedBuilder } from 'discord.js';
import { COLOR } from '../../util/embeds/color.js';
import { FOOTER } from '../../util/embeds/footer.js';
import { applyAuthor } from '../../util/embeds/author.js';
import { logger } from '../../util/logger.js';
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

    const description = `> Hello ${member}, welcome to **The Core**.\n\n> Please read the rules in channel <#${RULES_CHANNEL_ID}>!`;

    const embed = applyAuthor(new EmbedBuilder(), 'WELCOME')
      .setColor(COLOR)
      .setTitle('Welcome!')
      .setDescription(description)
      .setFooter(FOOTER)
      .setThumbnail(WELCOME_IMAGE_URL);

    try {
      await channel.send({ embeds: [embed] });
    } catch (err) {
      welcomeLogger.warn('Nachricht konnte nicht gesendet werden:', err);
    }
  },
};
