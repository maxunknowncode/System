const TEMPLATE_PATTERN = /\{\{(\w+)\}\}/g;

export const DEFAULT_LANGUAGE = 'en';

export function resolveText(entry, lang = DEFAULT_LANGUAGE, replacements = {}) {
  if (entry == null) {
    return '';
  }

  let value;
  if (typeof entry === 'string') {
    value = entry;
  } else if (typeof entry === 'object') {
    value = entry[lang] ?? entry[DEFAULT_LANGUAGE] ?? '';
  } else {
    value = String(entry);
  }

  if (!value || typeof value !== 'string') {
    return '';
  }

  return value.replace(TEMPLATE_PATTERN, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(replacements, key)) {
      const replacement = replacements[key];
      return replacement != null ? String(replacement) : '';
    }
    return match;
  });
}

export function resolveFields(fieldDefinitions, lang = DEFAULT_LANGUAGE, replacements = {}) {
  return fieldDefinitions.map((field) => ({
    name: resolveText(field.name, lang, replacements),
    value: resolveText(field.value, lang, replacements),
    inline: Boolean(field.inline),
  }));
}

export const GENERIC_MESSAGES = Object.freeze({
  errorWithReference: {
    en: 'Something went wrong. Reference: {{errorId}}',
    de: 'Etwas ist schiefgelaufen. Referenz: {{errorId}}',
  },
  unknownCommand: {
    en: 'Unknown command.',
    de: 'Unbekannter Befehl.',
  },
  noPermission: {
    en: 'You do not have permission to use this command.',
    de: 'Du hast keine Berechtigung, diesen Befehl zu verwenden.',
  },
  genericErrorTitle: {
    en: 'Error',
    de: 'Fehler',
  },
});

export const VERIFY_MESSAGES = Object.freeze({
  embed: {
    title: {
      en: '✅ Verify — Access the Server',
      de: '✅ Verifizierung — Zugriff auf den Server',
    },
    description: {
      en: '🛡️ *Official verification by **{{brand}} Team** — please confirm you’re not a bot.*',
      de: '🛡️ *Offizielle Verifizierung von **{{brand}} Team** — bitte bestätige, dass du kein Bot bist.*',
    },
    fields: [
      {
        name: {
          en: '🎯 __**What happens**__',
          de: '🎯 __**Was passiert**__',
        },
        value: {
          en: '> You unlock channels & roles like <@&{{verifyRoleId}}>.',
          de: '> Du schaltest Kanäle & Rollen frei, z. B. <@&{{verifyRoleId}}>.',
        },
      },
      {
        name: {
          en: 'ℹ️ __**How to**__',
          de: 'ℹ️ __**So geht’s**__',
        },
        value: {
          en: '> Press **Verify**. It’s instant and safe.',
          de: '> Klicke **Verify**. Geht sofort und ist sicher.',
        },
      },
    ],
  },
  responseTitle: {
    en: 'Verification',
    de: 'Verifizierung',
  },
  alreadyVerified: {
    en: 'ℹ️ You are already verified.',
    de: 'ℹ️ Du bist bereits verifiziert.',
  },
  success: {
    en: '✅ You are now verified!',
    de: '✅ Du bist jetzt verifiziert!',
  },
  failure: {
    en: '⚠️ Verification failed. Please try again or contact staff.',
    de: '⚠️ Verifizierung fehlgeschlagen. Bitte versuche es erneut oder kontaktiere das Team.',
  },
});

export const TEAM_MESSAGES = Object.freeze({
  title: {
    de: 'Unser Team',
    en: 'Our Team',
  },
  intro: {
    de: '> *Sehr geehrte Community, hier findet Ihr unsere Teamliste - hier könnt Ihr entnehmen wer zum Serverteam gehört und wer nicht, dies hilft um immer zu wissen ob man den Personen trauen kann.*',
    en: '> *Dear community, here you can find our team list — you can see who is part of the server team and who isn\'t; this helps you always know whether you can trust the person.*',
  },
  emptyRole: {
    de: '— aktuell keine Mitglieder',
    en: '— no members yet',
  },
  roleDescriptions: Object.freeze({
    teamOwner: {
      de: 'Server-Inhaber: Gesamtverantwortung, finale Entscheidungen, schützt die Vision.',
      en: 'Server owner: ultimate responsibility, final decisions, protects the vision.',
    },
    teamCoOwner: {
      de: 'Stellvertretung des Owners: Strategie, Planung, übernimmt bei Abwesenheit.',
      en: 'Deputy to the owner: strategy, planning, steps in when needed.',
    },
    teamAdministrator: {
      de: 'Administration: Rechte, Sicherheit, Struktur & technische Abläufe.',
      en: 'Administration: permissions, security, structure & technical operations.',
    },
    teamHeadModerator: {
      de: 'Leitung Moderation: Eskalationen, Qualitätssicherung, Coaching des Mod-Teams.',
      en: 'Head of moderation: escalations, quality assurance, coaching the mod team.',
    },
    teamModerator: {
      de: 'Moderation: Regeln durchsetzen, Chat sauber halten, Tickets unterstützen.',
      en: 'Moderation: enforce rules, keep chat clean, support tickets.',
    },
    teamSupporter: {
      de: 'Support: erste Hilfe, Fragen beantworten, an passende Teams weiterleiten.',
      en: 'Support: first-line help, answers questions, routes to the right teams.',
    },
    teamDeveloper: {
      de: 'Development: Bot, Automationen, Fixes, Deployments, interne Tools.',
      en: 'Development: bot, automations, fixes, deployments, internal tools.',
    },
    teamEditing: {
      de: 'Editing: Video/Grafik, Thumbnails, Assets, Qualität von Media.',
      en: 'Editing: video/graphics, thumbnails, assets, media quality.',
    },
    teamEvent: {
      de: 'Events: Planung, Orga, Umsetzung von Aktionen & Giveaways.',
      en: 'Events: planning, organization, execution of activities & giveaways.',
    },
    teamGamingLead: {
      de: 'Gaming Lead: koordiniert Spiel-Bereiche, Community-Events & Teamplay.',
      en: 'Gaming lead: coordinates game areas, community events & team play.',
    },
  }),
});

export const RULES_MESSAGES = Object.freeze({
  title: {
    en: '📜 Rules — Please Read',
    de: '📜 Regeln — Bitte lesen',
  },
  description: {
    en: '🛡️ *Official server rules by **{{brand}} Team** — everyone must follow them.*',
    de: '🛡️ *Offizielle Server-Regeln von **{{brand}} Team** — alle müssen sich daran halten.*',
  },
  fields: [
    {
      name: { en: '🤝 __**Respect & Safety**__', de: '🤝 __**Respekt & Sicherheit**__' },
      value: {
        en: '> **Be respectful** — no harassment, hate speech, or slurs. Keep it welcoming.',
        de: '> **Sei respektvoll** — keine Belästigung, Hassrede oder Beleidigungen.',
      },
    },
    {
      name: { en: '🗂️ __**Stay on Topic**__', de: '🗂️ __**Beim Thema bleiben**__' },
      value: {
        en: '> Use channels for their purpose; off-topic goes to the right place.',
        de: '> Nutze Kanäle zweckgemäß; Off-Topic gehört in den passenden Bereich.',
      },
    },
    {
      name: { en: '🚫 __**No Spam / Self-Promo**__', de: '🚫 __**Kein Spam / Eigenwerbung**__' },
      value: {
        en: '> **No spam**, unsolicited ads, mass pings, or link dumps.',
        de: '> **Kein Spam**, keine unerbetene Werbung, Massen-Pings oder Link-Fluten.',
      },
    },
    {
      name: { en: '⚠️ __**Safe Content**__', de: '⚠️ __**Sicherer Inhalt**__' },
      value: {
        en: '> **No NSFW**, illegal content, malware or exploits.',
        de: '> **Kein NSFW**, nichts Illegales, keine Malware oder Exploits.',
      },
    },
    {
      name: { en: '🔐 __**Privacy First**__', de: '🔐 __**Privatsphäre zuerst**__' },
      value: {
        en: '> **No doxxing** or sharing personal data of yourself or others.',
        de: '> **Kein Doxxing** oder Weitergabe persönlicher Daten.',
      },
    },
    {
      name: { en: '🛠️ __**Staff Decisions**__', de: '🛠️ __**Team-Entscheidungen**__' },
      value: {
        en: '> Follow moderator instructions; appeal **politely** if needed.',
        de: '> Folge den Anweisungen der Moderation; Einsprüche **sachlich**.',
      },
    },
    {
      name: { en: '🌐 __**Language**__', de: '🌐 __**Sprache**__' },
      value: {
        en: '> Keep messages readable; **English** unless a channel states otherwise.',
        de: '> Halte Nachrichten lesbar; **Englisch**, außer ein Kanal sagt anderes.',
      },
    },
    {
      name: { en: '🛡️ __**Security**__', de: '🛡️ __**Sicherheit**__' },
      value: {
        en: '> Report suspicious behavior; **no impersonation** of staff or users.',
        de: '> Melde Verdächtiges; **keine Imitationen** von Team oder Nutzer*innen.',
      },
    },
    {
      name: { en: '📏 __**Enforcement**__', de: '📏 __**Durchsetzung**__' },
      value: {
        en: '> Warnings, mutes, kicks, bans — at staff discretion.',
        de: '> Verwarnungen, Mutes, Kicks, Bans — nach Ermessen des Teams.',
      },
    },
  ],
});

export const TICKET_MESSAGES = Object.freeze({
  panelDescription: {
    en: '🇺🇸 **English**\n> Select which type of ticket you would like to open in the dropdown menu!\n\n🇩🇪 **Deutsch**\n> Wähle im Dropdown-Menü aus, welche Art von Ticket du öffnen möchtest!',
    de: '🇺🇸 **English**\n> Select which type of ticket you would like to open in the dropdown menu!\n\n🇩🇪 **Deutsch**\n> Wähle im Dropdown-Menü aus, welche Art von Ticket du öffnen möchtest!',
  },
  createdTitle: {
    en: 'Ticket Created',
    de: 'Ticket erstellt',
  },
  createdDescription: {
    en: 'Ticket created. Here is your ticket: {{ticketChannel}}',
    de: 'Ticket erstellt. Hier ist dein Ticket: {{ticketChannel}}',
  },
  promptDescription: {
    en: '> 🇺🇸 Please describe your issue while you’re waiting.',
    de: '> 🇩🇪 Bitte beschreibe dein Anliegen, während du wartest.',
  },
  claimDeniedTitle: {
    en: 'No Permission',
    de: 'Keine Berechtigung',
  },
  claimDeniedDescription: {
    en: 'You do not have permission to claim this ticket.',
    de: 'Du hast keine Berechtigung, dieses Ticket zu übernehmen.',
  },
  claimedAnnouncement: {
    en: '🇺🇸 **Claimed** by <@{{userId}}>\n\n🇩🇪 **Beansprucht** von <@{{userId}}>',
    de: '🇺🇸 **Claimed** by <@{{userId}}>\n\n🇩🇪 **Beansprucht** von <@{{userId}}>',
  },
  confirmClose: {
    en: '🇺🇸 **Are you sure** you want to close this ticket?\n\n🇩🇪 **Bist du sicher**, dass du dieses Ticket schließen möchtest?',
    de: '🇺🇸 **Are you sure** you want to close this ticket?\n\n🇩🇪 **Bist du sicher**, dass du dieses Ticket schließen möchtest?',
  },
  archived: {
    en: '🇺🇸 **Ticket archived**\n\n🇩🇪 **Ticket archiviert**',
    de: '🇺🇸 **Ticket archived**\n\n🇩🇪 **Ticket archiviert**',
  },
  confirmReopen: {
    en: '🇺🇸 Reopen this ticket?\n🇩🇪 Dieses Ticket wieder eröffnen?',
    de: '🇺🇸 Reopen this ticket?\n🇩🇪 Dieses Ticket wieder eröffnen?',
  },
  reopenedInfo: {
    en: '🔓 Ticket reopened | 🔓 Ticket wieder eröffnet\n• Please describe your issue. | Bitte beschreibe dein Anliegen.',
    de: '🔓 Ticket reopened | 🔓 Ticket wieder eröffnet\n• Bitte beschreibe dein Anliegen. | Bitte beschreibe dein Anliegen.',
  },
  reopenedNotice: {
    en: 'Reopened | Wieder eröffnet',
    de: 'Reopened | Wieder eröffnet',
  },
  confirmDelete: {
    en: '🇺🇸 **Are you sure** you want to delete this ticket?\n\n🇩🇪 **Bist du sicher**, dass du dieses Ticket löschen möchtest?',
    de: '🇺🇸 **Are you sure** you want to delete this ticket?\n\n🇩🇪 **Bist du sicher**, dass du dieses Ticket löschen möchtest?',
  },
  deleting: {
    en: '🇺🇸 **Deleting in 5 seconds…**\n\n🇩🇪 **Löschen in 5 Sekunden…**',
    de: '🇺🇸 **Deleting in 5 seconds…**\n\n🇩🇪 **Löschen in 5 Sekunden…**',
  },
});

export const CLEAR_COMMAND_MESSAGES = Object.freeze({
  resultTitle: {
    en: 'Messages Cleared',
    de: 'Nachrichten gelöscht',
  },
  resultDescription: {
    en: 'Deleted **{{deleted}}** messages in <#{{channelId}}>.',
    de: '**{{deleted}}** Nachrichten in <#{{channelId}}> gelöscht.',
  },
  noPermissionTitle: {
    en: 'No Permission',
    de: 'Keine Berechtigung',
  },
});

export const WELCOME_MESSAGES = Object.freeze({
  title: {
    en: 'Welcome!',
    de: 'Willkommen!',
  },
  description: {
    en: '> Hello {{member}}, welcome to **{{brand}}**.\n\n> Please read the rules in channel <#{{rulesChannelId}}>!',
    de: '> Hallo {{member}}, willkommen bei **{{brand}}**.\n\n> Bitte lies die Regeln im Kanal <#{{rulesChannelId}}>!',
  },
});
