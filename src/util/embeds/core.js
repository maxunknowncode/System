/*
### Zweck: Zentrale Factory für Embeds mit einheitlicher Gestaltung.
*/
import { EmbedBuilder } from 'discord.js';
import { BRAND_COLOR, BRAND_FOOTER, BRAND_PREFIX } from '../../config/branding.js';
import { applyAuthorByLang } from './author.js';

export function coreEmbed(context, lang = 'en') {
  const footerText = BRAND_FOOTER[lang] ?? BRAND_FOOTER.en;
  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setFooter({ text: footerText })
    .setTimestamp();

  if (context) {
    applyAuthorByLang(embed, context, lang);
  }

  return embed;
}

export function brandTitle(raw) {
  if (raw == null) {
    return BRAND_PREFIX;
  }

  const title = String(raw);
  return title.startsWith(BRAND_PREFIX) ? title : `${BRAND_PREFIX}${title}`;
}
