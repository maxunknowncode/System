import { BRAND_AUTHOR_ICON, BRAND_PREFIX } from '../../config/branding.js';

const LABELS = {
  ANN: {
    en: "Announcements",
    de: "Ankündigungen",
  },
  LOGS: {
    en: "Logs",
    de: "Logs",
  },
  RULES: {
    en: "Rules",
    de: "Regelwerk",
  },
  TEAM: {
    en: "Team List",
    de: "Teamliste",
  },
  TICKET: {
    en: "Ticket System",
    de: "Ticketsystem",
  },
  VERIFY: {
    en: "Verify System",
    de: "Verifizierungssystem",
  },
  WELCOME: {
    en: "Welcome",
    de: "Willkommen",
  },
};

function resolveLabel(context, lang) {
  const entry = LABELS[context];
  if (!entry) {
    return context;
  }

  return entry[lang] ?? entry.en ?? context;
}

export function applyAuthorByLang(embed, context, lang = "en") {
  const label = resolveLabel(context, lang);
  const name = `${BRAND_PREFIX}${label}`;

  return embed.setAuthor({ name, iconURL: BRAND_AUTHOR_ICON });
}

export function applyAuthor(embed, context) {
  return applyAuthorByLang(embed, context, "en");
}
