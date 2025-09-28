export const AUTHOR_ICON =
  "https://cdn.discordapp.com/attachments/1393205203276402768/1415752436676562954/ChatGPT_Image_5._Sept._2025_17_41_03.png?ex=68c5ab34&is=68c459b4&hm=e36e2f2bda07f45f25e7a4953502a233341a16714afc1afa0821d63a88332098&";

// Für jede Einbettung das passende EN- und DE-Label
export const AUTHORS = {
  TICKET: {
    en: "The Core - Ticket System",
    de: "The Core - Ticket System",
  },
  WELCOME: {
    en: "The Core Welcome/Willkommen",
  },
  VERIFY: {
    en: "The Core - Verify System",
    de: "The Core - Verify System",
  },
  RULES: {
    en: "The Core - Rules",
    de: "The Core - Regelwerk",
  },
  TEAM: {
    en: "The Core - Team List",
    de: "The Core - Teamliste",
  },
  ANN: {
    en: "The Core - Announcements",
    de: "The Core - Ankündigungen",
  },
  LOGS: {
    en: "The Core – Logs",
    de: "The Core – Logs",
  },
};

/**
 * Wendet den richtigen Autor auf ein Embed an – je nach Kontext (VERIFY, RULES, TEAM, ANN)
 * und gewählter Sprache ('en' oder 'de'). Fällt auf 'en' oder 'The Core' zurück, wenn nichts gefunden wird.
 *
 * @param {EmbedBuilder} embed
 * @param {"VERIFY"|"RULES"|"TEAM"|"ANN"|"LOGS"|"WELCOME"} context
 * @param {"en"|"de"} lang
 * @returns {EmbedBuilder}
 */
export function applyAuthorByLang(embed, context, lang = "en") {
  const entry = AUTHORS[context];
  const name = entry?.[lang] ?? entry?.en ?? "The Core";
  return embed.setAuthor({ name, iconURL: AUTHOR_ICON });
}

/**
 * Legacy-Helfer für Module ohne Sprachwahl (z. B. Tickets).
 * Verwendet standardmäßig die englische Variante.
 *
 * @param {EmbedBuilder} embed
 * @param {"TICKET"|"VERIFY"|"RULES"|"TEAM"|"ANN"|"WELCOME"} context
 * @returns {EmbedBuilder}
 */
export function applyAuthor(embed, context) {
  return applyAuthorByLang(embed, context, "en");
}
