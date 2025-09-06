import { TICKET_CHANNEL_PREFIX, TEAM_ROLE_ID } from './config.js';

export function slugUsername(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildTicketName(user) {
  return `${TICKET_CHANNEL_PREFIX}-${slugUsername(user.username)}`;
}

export function isTeam(member) {
  return member.roles.cache.has(TEAM_ROLE_ID);
}

export async function setStatusPrefix(channel, mode) {
  if (!channel?.manageable) return;
  const base = channel.name.replace(/^(?:✅\s|🔴-)+/, '');
  let prefix = '';
  if (mode === 'claimed') prefix = '✅ ';
  if (mode === 'closed') prefix = '🔴-';
  const newName = `${prefix}${base}`;
  if (channel.name !== newName) {
    try {
      await channel.setName(newName);
    } catch {}
  }
}
