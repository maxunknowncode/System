import { EmbedBuilder } from 'discord.js';
import { AUTHOR_ICON } from './embeds/author.js';
import { formatLogArgs, registerLogTransport } from './logger.js';

const DEFAULT_GENERAL_CHANNEL_ID = '1416432156770566184';
const DEFAULT_JOIN2CREATE_CHANNEL_ID = '1416432173690519562';

const generalChannelId = process.env.LOG_CHANNEL_GENERAL_ID ?? DEFAULT_GENERAL_CHANNEL_ID;
const joinToCreateChannelId = process.env.LOG_CHANNEL_JOIN2CREATE_ID ?? DEFAULT_JOIN2CREATE_CHANNEL_ID;

const LEVEL_COLOURS = {
  debug: 0x95a5a6,
  info: 0x3498db,
  warn: 0xf1c40f,
  error: 0xe74c3c,
};

const JOIN_PREFIX_REGEX = /^\s*\[join2create\]\s*/i;
const JOIN_MATCH_REGEX = /\[join2create\]/i;
const AUDIT_PREFIX_REGEX = /^\s*\[audit(?::[^\]]*)?\]\s*/i;
const AUDIT_MATCH_REGEX = /\[audit(?::[^\]]*)?\]/i;
const AUDIT_ACTION_REGEX = /\[audit(?::([^\]]+))?\]/i;
const MAX_QUEUE_SIZE = 50;

const truncate = (value, max) => {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, Math.max(0, max - 1))}…`;
};

const formatParts = (parts) => {
  if (!parts.length) {
    return '_Keine Details verfügbar_';
  }

  const formatted = parts.map((part) => {
    const trimmed = part.trim();
    if (!trimmed) {
      return '—';
    }

    if (trimmed.includes('\n')) {
      const truncated = truncate(trimmed, 1900);
      return `\u0060\u0060\u0060\n${truncated}\n\u0060\u0060\u0060`;
    }

    return truncate(trimmed, 1000);
  });

  return truncate(formatted.join('\n\n'), 4000);
};

const isJoin2CreateEntry = (args) =>
  args.some((arg) => typeof arg === 'string' && JOIN_MATCH_REGEX.test(arg));

const isAuditEntry = (args) =>
  args.some((arg) => typeof arg === 'string' && AUDIT_MATCH_REGEX.test(arg));

const determineContext = (args) => {
  if (isJoin2CreateEntry(args)) {
    return 'join2create';
  }
  if (isAuditEntry(args)) {
    return 'audit';
  }
  return 'general';
};

const stripJoinPrefix = (arg) => {
  if (typeof arg !== 'string') {
    return arg;
  }
  return arg.replace(JOIN_PREFIX_REGEX, '');
};

const stripAuditPrefix = (arg) => {
  if (typeof arg !== 'string') {
    return arg;
  }
  return arg.replace(AUDIT_PREFIX_REGEX, '');
};

const FALLBACK_FIELD_VALUE = '_Nicht angegeben_';

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && (value.constructor === Object || Object.getPrototypeOf(value) === null);

const normaliseId = (value) => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return null;
};

const formatMetadataKey = (key) => {
  const spaced = key.replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

const buildAuditPayload = (args) => {
  const metadataCandidate = args[args.length - 1];
  const metadata = isPlainObject(metadataCandidate) ? metadataCandidate : null;

  const formattedArgs = [];
  let actionType = typeof metadata?.action === 'string' ? metadata.action.trim() : '';

  args.forEach((arg, index) => {
    if (metadata && index === args.length - 1) {
      return;
    }

    if (typeof arg === 'string' && AUDIT_MATCH_REGEX.test(arg)) {
      if (!actionType) {
        const match = arg.match(AUDIT_ACTION_REGEX);
        actionType = match?.[1]?.trim() ?? '';
      }
      const withoutPrefix = stripAuditPrefix(arg).trim();
      if (withoutPrefix) {
        formattedArgs.push(withoutPrefix);
      }
      return;
    }

    formattedArgs.push(arg);
  });

  const description = formatParts(formatLogArgs(formattedArgs));

  const actorId = normaliseId(metadata?.actorId ?? metadata?.actor);
  const targetId = normaliseId(metadata?.targetId ?? metadata?.target);
  const channelId = normaliseId(metadata?.channelId ?? metadata?.channel);

  const actionFieldValue = actionType ? `\`${truncate(actionType, 256)}\`` : FALLBACK_FIELD_VALUE;
  const actorFieldValue = actorId ? `<@${actorId}>` : FALLBACK_FIELD_VALUE;
  const targetFieldValue = targetId ? `<@${targetId}>` : FALLBACK_FIELD_VALUE;
  const channelFieldValue = channelId ? `<#${channelId}>` : FALLBACK_FIELD_VALUE;

  const rawReason = metadata?.reason;
  const reasonText = typeof rawReason === 'string' ? rawReason.trim() : rawReason != null ? String(rawReason) : '';
  const reasonFieldValue = reasonText ? truncate(reasonText, 1024) : FALLBACK_FIELD_VALUE;

  const knownKeys = new Set(['actorId', 'actor', 'targetId', 'target', 'channelId', 'channel', 'reason', 'action']);
  const additionalFields = [];

  if (metadata) {
    for (const [key, value] of Object.entries(metadata)) {
      if (knownKeys.has(key)) {
        continue;
      }

      if (value == null) {
        additionalFields.push({ name: formatMetadataKey(key), value: FALLBACK_FIELD_VALUE, inline: false });
        continue;
      }

      const [formatted] = formatLogArgs([value]);
      const cleanedValue = formatted?.trim();
      additionalFields.push({
        name: formatMetadataKey(key),
        value: cleanedValue ? truncate(cleanedValue, 1024) : FALLBACK_FIELD_VALUE,
        inline: false,
      });
    }
  }

  const fields = [
    { name: 'Aktion', value: actionFieldValue, inline: true },
    { name: 'Auslöser', value: actorFieldValue, inline: true },
    { name: 'Ziel', value: targetFieldValue, inline: true },
    { name: 'Kanal', value: channelFieldValue, inline: true },
    { name: 'Grund', value: reasonFieldValue, inline: false },
    ...additionalFields,
  ];

  return { description, fields };
};

export function setupDiscordLogging(client) {
  const channelCache = new Map();
  const queue = [];
  let ready = Boolean(client.isReady?.());

  const internalLog = (level, ...args) => {
    const method = level === 'error' ? 'error' : 'warn';
    console[method]('[discord-logging]', ...args);
  };

  const resolveChannel = async (channelId) => {
    if (!channelId) {
      return null;
    }

    if (channelCache.has(channelId)) {
      return channelCache.get(channelId);
    }

    try {
      const channel = await client.channels.fetch(channelId);
      if (channel?.isTextBased?.()) {
        channelCache.set(channelId, channel);
        return channel;
      }
      channelCache.set(channelId, null);
      internalLog('warn', `Kanal ${channelId} ist nicht textbasiert – überspringe`);
      return null;
    } catch (err) {
      channelCache.set(channelId, null);
      internalLog('error', `Kanal ${channelId} konnte nicht geladen werden:`, err);
      return null;
    }
  };

  const deliver = async (entry) => {
    const context = determineContext(entry.args);
    const targetId = context === 'join2create' ? joinToCreateChannelId : generalChannelId;
    const fallbackId = generalChannelId;

    let channel = await resolveChannel(targetId);
    if (!channel && targetId !== fallbackId) {
      channel = await resolveChannel(fallbackId);
    }
    if (!channel) {
      return;
    }

    if (context === 'general') {
      const description = formatParts(formatLogArgs(entry.args));
      await channel.send({ content: description, allowedMentions: { parse: [] } });
      return;
    }

    if (context === 'audit') {
      const payload = buildAuditPayload(entry.args);
      const embed = new EmbedBuilder()
        .setColor(LEVEL_COLOURS[entry.level] ?? LEVEL_COLOURS.info)
        .setAuthor({ name: `System Logger • ${entry.level.toUpperCase()}`, iconURL: AUTHOR_ICON })
        .setDescription(payload.description)
        .setTimestamp(entry.timestamp)
        .addFields({ name: 'Level', value: `\`${entry.level.toUpperCase()}\``, inline: true }, ...payload.fields)
        .setFooter({ text: 'Automatisches Logsystem' });

      await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
      return;
    }

    const cleanedArgs = entry.args.map(stripJoinPrefix);
    const description = formatParts(formatLogArgs(cleanedArgs));
    const embed = new EmbedBuilder()
      .setColor(LEVEL_COLOURS[entry.level] ?? LEVEL_COLOURS.info)
      .setAuthor({ name: `System Logger • ${entry.level.toUpperCase()}`, iconURL: AUTHOR_ICON })
      .setDescription(description)
      .setTimestamp(entry.timestamp)
      .addFields(
        { name: 'Level', value: `\`${entry.level.toUpperCase()}\``, inline: true },
        { name: 'Kategorie', value: 'Join2Create', inline: true },
      )
      .setFooter({ text: 'Automatisches Logsystem' });

    await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
  };

  const flushQueue = () => {
    if (!ready || queue.length === 0) {
      return;
    }

    const entries = queue.splice(0, queue.length);
    for (const entry of entries) {
      void deliver(entry).catch((err) => internalLog('error', 'Fehler beim Senden eines Log-Eintrags:', err));
    }
  };

  const handler = (entry) => {
    if (!ready) {
      queue.push(entry);
      if (queue.length > MAX_QUEUE_SIZE) {
        queue.shift();
      }
      return;
    }

    void deliver(entry).catch((err) => internalLog('error', 'Fehler beim Senden eines Log-Eintrags:', err));
  };

  const unsubscribe = registerLogTransport(handler);

  if (!ready) {
    client.once('ready', () => {
      ready = true;
      flushQueue();
    });
  }

  return unsubscribe;
}
