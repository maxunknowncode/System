import { EmbedBuilder } from 'discord.js';
import { applyAuthorByLang } from '../embeds/author.js';
import { truncate, isPlainObject } from './formatting.js';
import { getLogChannelIds } from './config.js';
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
const DESCRIPTION_LIMIT = 200;
const FIELD_VALUE_LIMIT = 60;
const FALLBACK_FIELD_VALUE = '—';
const DEDUP_WINDOW_MS = 60_000;

const collapseToSingleLine = (value) => value.replace(/\s+/g, ' ').trim();

const buildDescriptionText = (values, limit = DESCRIPTION_LIMIT) => {
  if (!Array.isArray(values) || values.length === 0) {
    return FALLBACK_FIELD_VALUE;
  }

  const formatted = formatLogArgs(values)
    .map((part) => (typeof part === 'string' ? part : part == null ? '' : String(part)))
    .map((part) => collapseToSingleLine(part))
    .filter((part) => part.length > 0);

  if (!formatted.length) {
    return FALLBACK_FIELD_VALUE;
  }

  const [first, ...rest] = formatted;
  const combined = rest.length ? `${first} • ${rest.join(' • ')}` : first;
  return truncate(combined, limit);
};

const normaliseFieldText = (value) => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? truncate(trimmed, FIELD_VALUE_LIMIT) : FALLBACK_FIELD_VALUE;
  }
  if (value == null) {
    return FALLBACK_FIELD_VALUE;
  }
  const stringValue = String(value).trim();
  return stringValue ? truncate(stringValue, FIELD_VALUE_LIMIT) : FALLBACK_FIELD_VALUE;
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

  const contextSegments = entry.context?.segments ?? [];
  const contextAction =
    contextSegments.length > 1 ? contextSegments.slice(1).join(':').trim() : '';
  let actionType = typeof metadata?.action === 'string' ? metadata.action.trim() : '';
  if (!actionType && contextAction) {
    actionType = contextAction;
  }

  const messageParts = metadata ? args.slice(0, -1) : args;
  const cleanedParts = messageParts.map((arg) => {
    if (typeof arg === 'string' && AUDIT_MATCH_REGEX.test(arg)) {
      if (!actionType) {
        const match = arg.match(AUDIT_ACTION_REGEX);
        actionType = match?.[1]?.trim() ?? '';
      }
      const closingIndex = arg.indexOf(']');
      return closingIndex >= 0 ? arg.slice(closingIndex + 1).trim() : '';
    }
    return arg;
  });

  const description = buildDescriptionText(cleanedParts);

  const actorId = normaliseId(metadata?.actorId ?? metadata?.actor);
  const targetId = normaliseId(metadata?.targetId ?? metadata?.target);

  const actorMention =
    typeof metadata?.actorMention === 'string' ? metadata.actorMention.trim() : '';
  const actorLabel =
    typeof metadata?.actorLabel === 'string' ? metadata.actorLabel.trim() : '';
  const targetMention =
    typeof metadata?.targetMention === 'string' ? metadata.targetMention.trim() : '';
  const targetLabel =
    typeof metadata?.targetLabel === 'string' ? metadata.targetLabel.trim() : '';

  const actionFieldValue = normaliseFieldText(actionType);

  let actorFieldValue = '';
  if (actorMention) {
    actorFieldValue = actorMention;
  } else if (actorId) {
    actorFieldValue = `<@${actorId}>`;
  } else if (actorLabel) {
    actorFieldValue = actorLabel;
  }

  let targetFieldValue = '';
  if (targetMention) {
    targetFieldValue = targetMention;
  } else if (targetLabel) {
    targetFieldValue = targetLabel;
  } else if (targetId) {
    targetFieldValue = targetId;
  }

  const rawReason = metadata?.reason;
  const reasonText =
    typeof rawReason === 'string'
      ? rawReason.trim()
      : rawReason != null
      ? String(rawReason).trim()
      : '';

  const fields = [
    { name: 'Aktion', value: actionFieldValue, inline: true },
    { name: 'Auslöser', value: normaliseFieldText(actorFieldValue), inline: true },
    { name: 'Ziel', value: normaliseFieldText(targetFieldValue), inline: true },
  ];

  if (reasonText) {
    fields.push({ name: 'Grund', value: normaliseFieldText(reasonText), inline: false });
  }

  return { description, fields };
};

const serialiseForKey = (value) => {
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof Error) {
    return `${value.name}:${value.message}`;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const buildDedupKey = (entry) => {
  const label = entry.context?.label ?? 'general';
  const rawArgs = getRawArgs(entry).map((value) => serialiseForKey(value));
  return [entry.level ?? 'info', label, ...rawArgs].join('|');
};

export function setupDiscordLogging(client, options = {}) {
  const fallbackChannelIds = getLogChannelIds();
  const generalChannelId = normaliseId(
    options.generalChannelId ?? fallbackChannelIds.generalChannelId,
  );
  const joinToCreateChannelId = normaliseId(
    options.joinToCreateChannelId ?? fallbackChannelIds.joinToCreateChannelId,
  );

  const channelCache = new Map();
  const queue = [];
  let ready = Boolean(client.isReady?.());
  const dedupState = new Map();

  const internalLog = (level, ...args) => {
    const method = level === 'error' ? 'error' : 'warn';
    console[method]('[discord-logging]', ...args);
  };

  if (!generalChannelId) {
    internalLog(
      'warn',
      'Kein gültiger allgemeiner Discord-Log-Kanal konfiguriert (LOG_CHANNEL_GENERAL_ID) – Einträge werden verworfen.',
    );
  }

  if (!joinToCreateChannelId) {
    const followUp = generalChannelId
      ? 'verwende allgemeinen Kanal.'
      : 'Join2Create-Einträge werden verworfen.';
    internalLog(
      'warn',
      `Kein gültiger Join2Create-Log-Kanal konfiguriert (LOG_CHANNEL_JOIN2CREATE_ID) – ${followUp}`,
    );
  }

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

  const createBaseEmbed = (entry) => {
    const level = entry.level ?? 'info';
    const embed = new EmbedBuilder()
      .setColor(LEVEL_COLOURS[level] ?? LEVEL_COLOURS.info)
      .setTimestamp(entry.timestamp ?? new Date());

    return applyAuthorByLang(embed, 'LOGS', 'de');
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
    const description = buildDescriptionText(cleaned);
    const embed = createBaseEmbed(entry).setDescription(description);
    return { embeds: [embed], allowedMentions: { parse: [] } };
  };

  const buildAuditMessage = (entry) => {
    const audit = buildAuditPayload(entry);
    const embed = createBaseEmbed(entry).setDescription(audit.description);
    if (audit.fields.length) {
      embed.addFields(...audit.fields);
    }
    return { embeds: [embed], allowedMentions: { parse: [] } };
  };

  const buildGeneralMessage = (entry) => {
    const description = buildDescriptionText(entry.args ?? []);
    const embed = createBaseEmbed(entry).setDescription(description);
    return { embeds: [embed], allowedMentions: { parse: [] } };
  };

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

  const flushDedupSummary = (key) => {
    const state = dedupState.get(key);
    if (!state) {
      return;
    }

    dedupState.delete(key);
    if (state.timer) {
      clearTimeout(state.timer);
    }

    if (state.count <= 1) {
      return;
    }

    const suppressed = state.count - 1;
    const label = state.label ?? 'general';
    const summaryEntry = {
      level: 'info',
      args: [
        `[logging:dedup] ${suppressed} weitere Einträge für [${label}] innerhalb von ${Math.round(DEDUP_WINDOW_MS / 1000)}s unterdrückt.`,
      ],
      rawArgs: [],
      timestamp: new Date(),
      context: {
        segments: ['logging', 'dedup'],
        label: 'logging:dedup',
        text: '[logging:dedup]',
        metadata: { suppressed, label },
      },
    };

    enqueue(summaryEntry);
  };

  const unsubscribe = registerLogTransport((entry) => {
    const key = buildDedupKey(entry);
    const now = Date.now();
    const state = dedupState.get(key);

    if (!state || now - state.lastTimestamp > DEDUP_WINDOW_MS) {
      if (state?.timer) {
        clearTimeout(state.timer);
      }
      dedupState.set(key, {
        count: 1,
        label: entry.context?.label ?? state?.label ?? 'general',
        lastTimestamp: now,
        timer: null,
      });
      enqueue(entry);
      return;
    }

    state.count += 1;
    state.lastTimestamp = now;
    state.label = entry.context?.label ?? state.label;
    if (state.timer) {
      clearTimeout(state.timer);
    }
    state.timer = setTimeout(() => flushDedupSummary(key), DEDUP_WINDOW_MS);
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
    for (const state of dedupState.values()) {
      if (state.timer) {
        clearTimeout(state.timer);
      }
    }
    dedupState.clear();
  };
}
