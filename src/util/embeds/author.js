import { BRAND_NAME } from './brand.js';

export const AUTHOR_ICON =
  "https://cdn.discordapp.com/attachments/1393205203276402768/1415752436676562954/ChatGPT_Image_5._Sept._2025_17_41_03.png?ex=68c5ab34&is=68c459b4&hm=e36e2f2bda07f45f25e7a4953502a233341a16714afc1afa0821d63a88332098&";

// Für jede Einbettung das passende EN- und DE-Label
export const AUTHORS = {
  WELCOME: {
    en: `${BRAND_NAME} - Welcome`,
    de: `${BRAND_NAME} - Willkommen`,
  },
  TICKET: {
    en: `${BRAND_NAME} - Ticket System`,
    de: `${BRAND_NAME} - Ticket System`,
  },
  VERIFY: {
    en: `${BRAND_NAME} - Verify System`,
    de: `${BRAND_NAME} - Verify System`,
  },
  RULES: {
    en: `${BRAND_NAME} - Rules`,
    de: `${BRAND_NAME} - Regelwerk`,
  },
  TEAM: {
    en: `${BRAND_NAME} - Team List`,
    de: `${BRAND_NAME} - Teamliste`,
  },
  ANN: {
    en: `${BRAND_NAME} - Announcements`,
    de: `${BRAND_NAME} - Ankündigungen`,
  },
  LOGS: {
    en: `${BRAND_NAME} - Logs`,
    de: `${BRAND_NAME} - Logs`,
  },
};

/**
 * Wendet den richtigen Autor auf ein Embed an – je nach Kontext (VERIFY, RULES, TEAM, ANN)
 * und gewählter Sprache ('en' oder 'de'). Fällt auf 'en' oder den Brand-Namen zurück, wenn nichts gefunden wird.
 *
 * @param {EmbedBuilder} embed
 * @param {"WELCOME"|"TICKET"|"VERIFY"|"RULES"|"TEAM"|"ANN"|"LOGS"} context
 * @param {"en"|"de"} lang
 * @returns {EmbedBuilder}
 */
export function applyAuthorByLang(embed, context, lang = "en") {
  const entry = AUTHORS[context];
  const name = entry?.[lang] ?? entry?.en ?? BRAND_NAME;
  return embed.setAuthor({ name, iconURL: AUTHOR_ICON });
}

/**
 * Legacy-Helfer für Module ohne Sprachwahl (z. B. Tickets).
 * Verwendet standardmäßig die englische Variante.
 *
 * @param {EmbedBuilder} embed
 * @param {"TICKET"|"VERIFY"|"RULES"|"TEAM"|"ANN"} context
 * @returns {EmbedBuilder}
 */
export function applyAuthor(embed, context) {
  return applyAuthorByLang(embed, context, "en");
}
