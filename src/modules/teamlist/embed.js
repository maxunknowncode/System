/*
### Zweck: Baut die Teamlisten-Embed und Sprach-Buttons.
*/
import {
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} from 'discord.js';
import { FOOTER } from '../../util/footer.js';
import { applyAuthor } from '../../util/author.js';
import {
  TEAM_BUTTON_ID_EN,
  TEAM_BUTTON_ID_DE,
  TEAM_ROLES,
} from './config.js';

async function getRoleMemberMentions(guild, roleId) {
  // Cache auffüllen, falls nötig
  if (guild.members.cache.size < guild.memberCount) {
    try {
      await guild.members.fetch();
    } catch {}
  }
  // Mitglieder mit der Rolle sammeln
  const members = guild.members.cache.filter(m => m.roles.cache.has(roleId));
  if (!members.size) return [];
  // Max 30 Zeilen, dann "…"
  const lines = Array.from(members.values())
    .slice(0, 30)
    .map(m => `> <@${m.id}>`);
  if (members.size > 30) lines.push('> …');
  return lines;
}

export async function buildTeamEmbedAndComponents(lang = 'en', guild) {
  const isDe = lang === 'de';

  const title = isDe ? '💠 Das Serverteam 💠' : '💠 The Server Team 💠';

  // Beschreibungen: beide Varianten als Quote ("> ") und kursiv (*...*)
  const description = isDe
    ? '> *Sehr geehrte Community, hier findet ihr unsere Teamliste. Hier könnt ihr sehen, wer zum Serverteam gehört. Dies hilft, um immer zu wissen, ob man den Personen trauen kann.*'
    : '> *Dear community, here you can find our team list. Here you can see who is part of the server team. This helps you always know whom you can trust.*';

  const embed = applyAuthor(new EmbedBuilder(), 'TEAM')
    .setColor(0xFFD700)
    .setTitle(title)
    .setDescription(description)
    .setFooter(FOOTER);

  // Nur Rollen rendern, die mindestens 1 Mitglied haben
  for (const role of TEAM_ROLES) {
    const desc = isDe ? role.descDe : role.descEn;
    const label = isDe ? role.labelDe : role.labelEn;

    const mentions = await getRoleMemberMentions(guild, role.id);
    if (mentions.length === 0) continue;

    // Titel = Label (ohne Emoji/Mention)
    // Wert: 1) Role-Mention, 2) kurze Beschreibung im Code-Style, 3) Mitglieder als Zitate
    const value = `<@&${role.id}>\n\`${desc}\`\n${mentions.join('\n')}`;
    embed.addFields({ name: label, value, inline: false });
  }

  // Sprach-Buttons (Flag + Text)
  const enButton = new ButtonBuilder()
    .setCustomId(TEAM_BUTTON_ID_EN)
    .setLabel('English')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('🇺🇸');

  const deButton = new ButtonBuilder()
    .setCustomId(TEAM_BUTTON_ID_DE)
    .setLabel('Deutsch')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('🇩🇪');

  const row = new ActionRowBuilder().addComponents(enButton, deButton);

  return { embeds: [embed], components: [row] };
}
