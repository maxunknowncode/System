import { OverwriteType } from 'discord.js';
import { TICKET_CHANNEL_PREFIX, TEAM_ROLE_ID } from './config.js';
import { hasRole } from '../../util/permissions.js';

export function slugUsername(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildTicketName(user, index) {
  return `${TICKET_CHANNEL_PREFIX}-${slugUsername(user.username)}-${index
    .toString()
    .padStart(2, '0')}`;
}

export function isTeam(member) {
  return hasRole(member, TEAM_ROLE_ID);
}

const PREFIX_STRIP_RE = /^(?:(?:✅[ -])|(?:🔴-))+/u;

// mode: "neutral" | "claimed" | "closed"
export async function setStatusPrefix(channel, mode) {
  const raw = channel.name;
  const base = raw.normalize().replace(PREFIX_STRIP_RE, "");
  const next =
    mode === "claimed" ? `✅ ${base}` :
    mode === "closed"  ? `🔴-${base}` :
    base;
  if (next !== raw) await channel.setName(next);
}

export function findTicketOwner(channel, botUserId) {
  const overwrites = channel.permissionOverwrites.cache;
  const candidate = overwrites.find(
    (overwrite) => overwrite.type === OverwriteType.Member && overwrite.id !== botUserId,
  );
  return candidate?.id ?? null;
}

export async function applyOpenPermissions(channel, userId) {
  if (!userId) {
    return;
  }

  await channel.permissionOverwrites.edit(userId, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
    AttachFiles: true,
  });
}

export async function applyClosedPermissions(channel, userId) {
  if (!userId) {
    return;
  }

  await channel.permissionOverwrites.edit(userId, {
    ViewChannel: true,
    SendMessages: false,
    AttachFiles: false,
  });
}
