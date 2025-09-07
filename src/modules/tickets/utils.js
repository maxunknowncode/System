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

// mode: "neutral" | "claimed" | "closed"
export async function setStatusPrefix(channel, mode) {
  const raw = channel.name;
  // alle führenden bekannten Präfixe entfernen (auch doppelte)
  const clean = raw.replace(/^(?:✅\s|🔴-)+/u, "");
  const next =
    mode === "claimed" ? `✅ ${clean}` :
    mode === "closed"  ? `🔴-${clean}` :
    clean;
  if (next !== raw) await channel.setName(next);
}
