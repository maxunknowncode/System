/*
### Zweck: Baut die Rules-Embed und die Sprachwahl-Buttons.
*/
import { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';
import { FOOTER } from '../../util/footer.js';
import { RULES_BUTTON_ID_EN, RULES_BUTTON_ID_DE } from './config.js';

export function buildRulesEmbedAndComponents(lang) {
  const isDe = lang === 'de';
  const title = isDe ? '📜 Server-Regeln — Bitte lesen' : '📜 Server Rules — Please Read';
  const description = isDe
    ? `**Willkommen!** Bitte halte dich an diese Regeln – für Sicherheit und Spaß.

1️⃣ **Sei respektvoll** — keine Belästigung, Hassrede oder Beleidigungen.  
2️⃣ **Bleib beim Thema** — nutze die Kanäle zweckgemäß.  
3️⃣ **Kein Spam oder Eigenwerbung** — keine unerbetene Werbung, Massen-Pings oder Link-Fluten.  
4️⃣ **Sicherer Inhalt** — kein NSFW, nichts Illegales, keine Malware oder Exploits.  
5️⃣ **Privatsphäre zuerst** — kein Doxxing, keine Weitergabe persönlicher Daten.  
6️⃣ **Team-Entscheidungen** — Folge den Mods; Einsprüche sachlich.  
7️⃣ **Sprache** — halte Nachrichten lesbar; Englisch, außer ein Kanal sagt etwas anderes.  
8️⃣ **Sicherheit** — melde Verdächtiges; keine Imitationen.

**Durchsetzung:** Verwarnungen, Mutes, Kicks, Bans — nach Ermessen des Teams.`
    : `**Welcome!** Please follow these rules to keep things safe and fun.

1️⃣ **Be respectful** — no harassment, hate speech, or slurs.  
2️⃣ **Stay on topic** — use channels for their purpose.  
3️⃣ **No spam or self-promo** — no unsolicited ads, mass pings, or link dumps.  
4️⃣ **Safe content** — no NSFW, illegal content, malware, or exploits.  
5️⃣ **Privacy first** — no doxxing or sharing personal data.  
6️⃣ **Staff decisions** — follow moderator instructions; appeal politely.  
7️⃣ **Language** — keep messages readable; use English unless a channel says otherwise.  
8️⃣ **Security** — report suspicious behavior; no impersonation.

**Enforcement:** Warnings, mutes, kicks, bans — at staff discretion.`;

  const embed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle(title)
    .setDescription(description)
    .setFooter(FOOTER);

  const enButton = new ButtonBuilder()
    .setCustomId(RULES_BUTTON_ID_EN)
    .setLabel('English')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('🇺🇸');

  const deButton = new ButtonBuilder()
    .setCustomId(RULES_BUTTON_ID_DE)
    .setLabel('Deutsch')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('🇩🇪');

  const row = new ActionRowBuilder().addComponents(enButton, deButton);

  return { embeds: [embed], components: [row] };
}
