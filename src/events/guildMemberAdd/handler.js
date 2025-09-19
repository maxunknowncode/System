/*
### Zweck: Reagiert auf neue Mitglieder und sendet eine Willkommensnachricht.
*/
import { Events, EmbedBuilder } from 'discord.js';
import { COLOR } from '../../util/embeds/color.js';
import { FOOTER } from '../../util/embeds/footer.js';
import { AUTHOR_ICON } from '../../util/embeds/author.js';
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

    const description = `> Hello ${member}, welcome to **The Core**.\n\n> Bitte lies dir die Regeln im Channel <#${RULES_CHANNEL_ID}> durch!`;

    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle('Welcome!')
      .setDescription(description)
      .setAuthor({ name: 'The Core', iconURL: AUTHOR_ICON })
      .setFooter(FOOTER)
      .setThumbnail(WELCOME_IMAGE_URL);

    try {
      await channel.send({ embeds: [embed] });
    } catch (err) {
      welcomeLogger.warn('Nachricht konnte nicht gesendet werden:', err);
    }
  },
};
