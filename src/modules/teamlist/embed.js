/*
### Zweck: Baut die Teamlisten-Embed und Sprach-Buttons.
*/
import { ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';
import { brandTitle, coreEmbed } from '../../util/embeds/core.js';
import {
  TEAM_BUTTON_ID_EN,
  TEAM_BUTTON_ID_DE,
  TEAM_ROLES,
  TEAM_ROLES_ORDER,
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
    .map((m) => `> <@${m.id}>`);
  if (members.size > 30) lines.push('> …');
  return lines;
}

export async function buildTeamEmbedAndComponents(lang = 'en', guild) {
  const isDe = lang === 'de';
  const title = resolveText(TEAM_MESSAGES.title, lang);

  const embed = coreEmbed('TEAM', lang);

  const intro = resolveText(TEAM_MESSAGES.intro, lang);
  if (intro) {
    const existingDescription = embed.data?.description;
    const description = existingDescription ? `${intro}\n\n${existingDescription}` : intro;
    embed.setDescription(description);
  }

  embed.setTitle(brandTitle(title));

  for (const roleKey of TEAM_ROLES_ORDER) {
    const role = TEAM_ROLES[roleKey];
    if (!role) continue;

    const desc = resolveText(TEAM_MESSAGES.roleDescriptions?.[roleKey], lang);
    const label = isDe ? role.labelDe : role.labelEn;

    const mentions = await getRoleMemberMentions(guild, role.id);

    const parts = [`<@&${role.id}>`];
    if (desc) {
      parts.push(`\`${desc}\``);
    }

    if (mentions.length) {
      parts.push(mentions.join('\n'));
    } else {
      parts.push(resolveText(TEAM_MESSAGES.emptyRole, lang));
    }

    embed.addFields({ name: label, value: parts.join('\n'), inline: false });
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
