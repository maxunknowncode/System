/*
### Zweck: Baut die Teamlisten-Embed und Sprach-Buttons.
*/
import { ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';
import { coreEmbed } from '../../util/embeds/core.js';
import {
  TEAM_BUTTON_ID_EN,
  TEAM_BUTTON_ID_DE,
  TEAM_ROLES,
} from './config.js';
import { logger } from '../../util/logging/logger.js';
import { hasRole } from '../../util/permissions.js';
import { TEAM_MESSAGES, resolveText } from '../../i18n/messages.js';

const teamLogger = logger.withPrefix('team:embed');

async function getRoleMemberMentions(guild, roleId) {
  // Cache auffüllen, falls nötig
  if (guild.members.cache.size < guild.memberCount) {
    try {
      await guild.members.fetch();
    } catch (err) {
      teamLogger.error('Mitglieder konnten nicht geladen werden:', err);
    }
  }
  // Mitglieder mit der Rolle sammeln
  const members = guild.members.cache.filter((member) => hasRole(member, roleId));
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
  const title = resolveText(TEAM_MESSAGES.title, lang);
  const description = resolveText(TEAM_MESSAGES.description, lang);

  const embed = coreEmbed('TEAM', lang)
    .setTitle(title)
    .setDescription(description);

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
