import { EmbedBuilder } from 'discord.js';
import { AUTHOR_ICON } from './embeds/author.js';
import { truncate, isPlainObject, formatMetadataKey } from './logging/formatting.js';
import { getLogChannelIds } from './logging/config.js';
import { formatLogArgs, registerLogTransport } from './logger.js';

const LEVEL_COLOURS = {
  debug: 0x95a5a6,
  info: 0x3498db,
  warn: 0xf1c40f,
  error: 0xe74c3c,
};

const JOIN_MATCH_REGEX = /\[join2create\]/i;
const AUDIT_MATCH_REGEX = /\[audit(?::[^\]]*)?\]/i;
const AUDIT_ACTION_REGEX = /\[audit(?::([^\]]+))?\]/i;
const MAX_QUEUE_SIZE = 50;
const DISCORD_PLAIN_TEXT_LIMIT = 2000; // Discord text messages are limited to 2000 characters.
const DISCORD_EMBED_DESCRIPTION_LIMIT = 4000; // Embed descriptions may use up to 4096 characters; we keep a safety margin.

// Default to the embed limit because most logs are delivered via embeds (Discord allows 4096 characters).
const formatParts = (parts, maxTotalLength = DISCORD_EMBED_DESCRIPTION_LIMIT) => {
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

  return truncate(formatted.join('\n\n'), maxTotalLength);
};

const getRawArgs = (entry) => {
  if (Array.isArray(entry.rawArgs)) {
    return entry.rawArgs;
  }
  if (Array.isArray(entry.args)) {
    return entry.args;
  }
  return [];
};

const isJoin2CreateEntry = (entry) => {
  if (entry.context?.segments?.[0] === 'join2create') {
    return 'join2create';
  }
  const rawArgs = getRawArgs(entry);
  return rawArgs.some((arg) => typeof arg === 'string' && JOIN_MATCH_REGEX.test(arg))
    ? 'join2create'
    : null;
};

const isAuditEntry = (entry) => {
  if (entry.context?.segments?.[0] === 'audit') {
    return 'audit';
  }
  const rawArgs = getRawArgs(entry);
  return rawArgs.some((arg) => typeof arg === 'string' && AUDIT_MATCH_REGEX.test(arg)) ? 'audit' : null;
};

const determineContext = (entry) => {
  if (isJoin2CreateEntry(entry)) {
    return 'join2create';
  }
  if (isAuditEntry(entry)) {
    return 'audit';
  }
  return 'general';
};

const FALLBACK_FIELD_VALUE = '_Nicht angegeben_';

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

const buildAuditPayload = (entry) => {
  const args = getRawArgs(entry);
  const metadataCandidate = args[args.length - 1];
  const metadata = isPlainObject(metadataCandidate) ? metadataCandidate : null;

  const formattedArgs = [];
  const contextSegments = entry.context?.segments ?? [];
  const contextAction =
    contextSegments.length > 1 ? contextSegments.slice(1).join(':').trim() : '';
  let actionType = typeof metadata?.action === 'string' ? metadata.action.trim() : '';
  if (!actionType && contextAction) {
    actionType = contextAction;
  }

  args.forEach((arg, index) => {
    if (metadata && index === args.length - 1) {
      return;
    }

    if (typeof arg === 'string' && AUDIT_MATCH_REGEX.test(arg)) {
      if (!actionType) {
        const match = arg.match(AUDIT_ACTION_REGEX);
        actionType = match?.[1]?.trim() ?? '';
      }
      const closingIndex = arg.indexOf(']');
      if (closingIndex >= 0) {
        const remainder = arg.slice(closingIndex + 1).trim();
        if (remainder) {
          formattedArgs.push(remainder);
        }
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

export function setupDiscordLogging(client, options = {}) {
  const fallbackChannelIds = getLogChannelIds();
  const generalChannelId = options.generalChannelId ?? fallbackChannelIds.generalChannelId;
  const joinToCreateChannelId =
    options.joinToCreateChannelId ?? fallbackChannelIds.joinToCreateChannelId;

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

  const formatDescription = (args, limit = DISCORD_EMBED_DESCRIPTION_LIMIT) => {
    const list = Array.isArray(args) ? args : [];
    return formatParts(formatLogArgs(list), limit);
  };

  const createBaseEmbed = (entry) => {
    const level = entry.level ?? 'info';
    const embed = new EmbedBuilder()
      .setColor(LEVEL_COLOURS[level] ?? LEVEL_COLOURS.info)
      .setTimestamp(entry.timestamp ?? new Date());

    embed.setAuthor({ name: 'The Core Logs', iconURL: AUTHOR_ICON });
    embed.addFields({ name: 'Level', value: `\`${level.toUpperCase()}\``, inline: true });

    const segments = entry.context?.segments ?? [];
    const label = segments.length ? segments.join(':') : null;
    if (label && label !== 'audit' && label !== 'join2create') {
      embed.addFields({ name: 'Kontext', value: `\`${truncate(label, 256)}\``, inline: true });
    }

    return embed;
  };

  const buildJoinToCreatePayload = (entry) => {
    const raw = entry.rawArgs ?? entry.args ?? [];
    const cleaned = Array.isArray(raw)
      ? raw
          .map((value) => {
            if (typeof value !== 'string') {
              return value;
            }
            const withoutTag = value.replace(JOIN_MATCH_REGEX, '').trim();
            return withoutTag.length ? withoutTag : null;
          })
          .filter((value) => value !== null)
      : [];
    const description = formatDescription(cleaned);
    const embed = createBaseEmbed(entry).setDescription(description);
    embed.addFields({ name: 'Kategorie', value: 'Join2Create', inline: true });
    return { embeds: [embed], allowedMentions: { parse: [] } };
  };

  const buildAuditMessage = (entry) => {
    const audit = buildAuditPayload(entry);
    const embed = createBaseEmbed(entry).setDescription(audit.description);
    embed.addFields({ name: 'Kategorie', value: 'Audit', inline: true });
    if (audit.fields.length) {
      embed.addFields(...audit.fields);
    }
    return { embeds: [embed], allowedMentions: { parse: [] } };
  };

  const buildGeneralMessage = (entry) => ({
    content: formatDescription(entry.args, DISCORD_PLAIN_TEXT_LIMIT),
    allowedMentions: { parse: [] },
  });

  const buildPayloadForEntry = (entry) => {
    const context = determineContext(entry);
    if (context === 'join2create') {
      return {
        payload: buildJoinToCreatePayload(entry),
        channelId: joinToCreateChannelId ?? generalChannelId,
      };
    }
    if (context === 'audit') {
      return { payload: buildAuditMessage(entry), channelId: generalChannelId };
    }
    return { payload: buildGeneralMessage(entry), channelId: generalChannelId };
  };

  let processing = false;

  const processQueue = async () => {
    if (processing || !ready) {
      return;
    }

    processing = true;
    try {
      while (queue.length) {
        const entry = queue.shift();
        if (!entry) {
          continue;
        }

        try {
          const { payload, channelId } = buildPayloadForEntry(entry);
          if (!channelId) {
            internalLog('warn', 'Kein Kanal für Discord-Logs konfiguriert – Eintrag verworfen.');
            continue;
          }

          const channel = await resolveChannel(channelId);
          if (!channel) {
            continue;
          }

          await channel.send(payload);
        } catch (err) {
          internalLog('error', 'Senden des Discord-Logs fehlgeschlagen:', err);
        }
      }
    } finally {
      processing = false;
    }
  };

  const enqueue = (entry) => {
    if (queue.length >= MAX_QUEUE_SIZE) {
      queue.shift();
      internalLog('warn', 'Discord-Log-Warteschlange voll – ältesten Eintrag verworfen.');
    }
    queue.push(entry);
    void processQueue();
  };

  const unsubscribe = registerLogTransport((entry) => {
    enqueue(entry);
  });

  let removeReadyListener = null;

  if (!ready) {
    const readyListener = () => {
      ready = true;
      void processQueue();
    };

    const addMethod = client?.on ?? client?.addListener ?? null;
    if (typeof addMethod === 'function') {
      addMethod.call(client, 'ready', readyListener);
      const offMethod = client?.off ?? client?.removeListener ?? client?.removeEventListener ?? null;
      if (typeof offMethod === 'function') {
        removeReadyListener = () => {
          offMethod.call(client, 'ready', readyListener);
        };
      }
    }
  }

  if (ready) {
    void processQueue();
  }

  return () => {
    removeReadyListener?.();
    unsubscribe();
  };
}
