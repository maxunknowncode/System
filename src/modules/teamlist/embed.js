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
import {
  TEAM_BUTTON_ID_EN,
  TEAM_BUTTON_ID_DE,
  TEAM_ROLES,
} from './config.js';

async function getRoleMemberMentions(guild, roleId) {
  if (guild.members.cache.size < guild.memberCount) {
    try { await guild.members.fetch(); } catch {}
  }
  const members = guild.members.cache.filter(m => m.roles.cache.has(roleId));
  if (!members.size) return [];
  const lines = Array.from(members.values()).slice(0, 30).map(m => `> <@${m.id}>`);
  if (members.size > 30) lines.push('> …');
  return lines;
}

export async function buildTeamEmbedAndComponents(lang = 'en', guild) {
  const isDe = lang === 'de';
  const title = isDe ? '💠 Das Serverteam 💠' : '💠 The Server Team 💠';
  const description = isDe
    ? '*Offizielle Teamliste von **The Core Team** — das sind die Personen, auf die ihr euch verlassen könnt.*'
    : '*Official staff list by **The Core Team** — these are the people you can rely on.*';

  const embed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle(title)
    .setDescription(description)
    .setFooter(FOOTER);

  for (const role of TEAM_ROLES) {
    const desc = isDe ? role.descDe : role.descEn;
    const label = isDe ? role.labelDe : role.labelEn;
    const mentions = await getRoleMemberMentions(guild, role.id);
    if (mentions.length === 0) continue;
    const value = `<@&${role.id}>\n\`${desc}\`\n${mentions.join('\n')}`;
    embed.addFields({ name: label, value, inline: false });
  }

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
