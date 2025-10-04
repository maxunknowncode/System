/*
### Zweck: Zentrale Factory für Embeds mit einheitlicher Gestaltung.
*/
import { EmbedBuilder } from 'discord.js';
import { COLOR } from './color.js';
import { FOOTER } from './footer.js';
import { applyAuthorByLang } from './author.js';

export function coreEmbed(context, lang = 'en') {
  const embed = new EmbedBuilder().setColor(COLOR).setFooter(FOOTER);
  applyAuthorByLang(embed, context, lang);
  return embed;
}
