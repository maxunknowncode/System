/*
### Zweck: Baut die Rules-Embed und die Sprachwahl-Buttons.
*/
import {
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} from "discord.js";
import { FOOTER } from "../../util/footer.js";
import { applyAuthor } from "../../util/author.js";
import { RULES_BUTTON_ID_EN, RULES_BUTTON_ID_DE } from "./config.js";

const FIELDS_EN = [
  {
    name: "🤝 __**Respect & Safety**__",
    value:
      "> **Be respectful** — no harassment, hate speech, or slurs. Keep it welcoming.",
    inline: false,
  },
  {
    name: "🗂️ __**Stay on Topic**__",
    value:
      "> Use channels for their purpose; off-topic goes to the right place.",
    inline: false,
  },
  {
    name: "🚫 __**No Spam / Self-Promo**__",
    value: "> **No spam**, unsolicited ads, mass pings, or link dumps.",
    inline: false,
  },
  {
    name: "⚠️ __**Safe Content**__",
    value: "> **No NSFW**, illegal content, malware or exploits.",
    inline: false,
  },
  {
    name: "🔐 __**Privacy First**__",
    value: "> **No doxxing** or sharing personal data of yourself or others.",
    inline: false,
  },
  {
    name: "🛠️ __**Staff Decisions**__",
    value: "> Follow moderator instructions; appeal **politely** if needed.",
    inline: false,
  },
  {
    name: "🌐 __**Language**__",
    value:
      "> Keep messages readable; **English** unless a channel states otherwise.",
    inline: false,
  },
  {
    name: "🛡️ __**Security**__",
    value:
      "> Report suspicious behavior; **no impersonation** of staff or users.",
    inline: false,
  },
  {
    name: "📏 __**Enforcement**__",
    value: "> Warnings, mutes, kicks, bans — at staff discretion.",
    inline: false,
  },
];

const FIELDS_DE = [
  {
    name: "🤝 __**Respekt & Sicherheit**__",
    value:
      "> **Sei respektvoll** — keine Belästigung, Hassrede oder Beleidigungen.",
    inline: false,
  },
  {
    name: "🗂️ __**Beim Thema bleiben**__",
    value:
      "> Nutze Kanäle zweckgemäß; Off-Topic gehört in den passenden Bereich.",
    inline: false,
  },
  {
    name: "🚫 __**Kein Spam / Eigenwerbung**__",
    value:
      "> **Kein Spam**, keine unerbetene Werbung, Massen-Pings oder Link-Fluten.",
    inline: false,
  },
  {
    name: "⚠️ __**Sicherer Inhalt**__",
    value: "> **Kein NSFW**, nichts Illegales, keine Malware oder Exploits.",
    inline: false,
  },
  {
    name: "🔐 __**Privatsphäre zuerst**__",
    value: "> **Kein Doxxing** oder Weitergabe persönlicher Daten.",
    inline: false,
  },
  {
    name: "🛠️ __**Team-Entscheidungen**__",
    value: "> Folge den Anweisungen der Moderation; Einsprüche **sachlich**.",
    inline: false,
  },
  {
    name: "🌐 __**Sprache**__",
    value:
      "> Halte Nachrichten lesbar; **Englisch**, außer ein Kanal sagt anderes.",
    inline: false,
  },
  {
    name: "🛡️ __**Sicherheit**__",
    value:
      "> Melde Verdächtiges; **keine Imitationen** von Team oder Nutzer*innen.",
    inline: false,
  },
  {
    name: "📏 __**Durchsetzung**__",
    value: "> Verwarnungen, Mutes, Kicks, Bans — nach Ermessen des Teams.",
    inline: false,
  },
];

export function buildRulesEmbedAndComponents(lang = "en") {
  const isDe = lang === "de";
  const fields = isDe ? FIELDS_DE : FIELDS_EN;
  const title = isDe ? "📜 Regeln — Bitte lesen" : "📜 Rules — Please Read";
  const description = isDe
    ? "🛡️ *Offizielle Server-Regeln von **The Core Team** — alle müssen sich daran halten.*"
    : "🛡️ *Official server rules by **The Core Team** — everyone must follow them.*";

  const embed = applyAuthor(new EmbedBuilder(), "RULES")
    .setColor(0xffd700)
    .setTitle(title)
    .setDescription(description)
    .setFields(fields)
    .setFooter(FOOTER);

  const enButton = new ButtonBuilder()
    .setCustomId(RULES_BUTTON_ID_EN)
    .setLabel("English")
    .setStyle(ButtonStyle.Primary)
    .setEmoji("🇺🇸");

  const deButton = new ButtonBuilder()
    .setCustomId(RULES_BUTTON_ID_DE)
    .setLabel("Deutsch")
    .setStyle(ButtonStyle.Secondary)
    .setEmoji("🇩🇪");

  const row = new ActionRowBuilder().addComponents(enButton, deButton);

  return { embeds: [embed], components: [row] };
}
