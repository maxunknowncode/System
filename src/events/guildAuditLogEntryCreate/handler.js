/*
### Zweck: Überwacht neue Audit-Log-Einträge und leitet sie strukturiert an den Logger weiter.
*/
import { AuditLogEvent } from 'discord-api-types/v10';
import { Events } from 'discord.js';
import { logger } from '../../util/logging/logger.js';
import {
  describeDiscordEntity,
  formatMetadataKey,
} from '../../util/logging/formatting.js';

const auditLogger = logger.withPrefix('audit');

const WARN_ACTIONS = new Set([
  AuditLogEvent.ChannelDelete,
  AuditLogEvent.ChannelOverwriteDelete,
  AuditLogEvent.MemberKick,
  AuditLogEvent.MemberPrune,
  AuditLogEvent.MemberBanAdd,
  AuditLogEvent.MemberBanRemove,
  AuditLogEvent.MemberDisconnect,
  AuditLogEvent.MemberMove,
  AuditLogEvent.MessageDelete,
  AuditLogEvent.MessageBulkDelete,
  AuditLogEvent.RoleDelete,
  AuditLogEvent.WebhookDelete,
  AuditLogEvent.EmojiDelete,
  AuditLogEvent.StickerDelete,
  AuditLogEvent.ThreadDelete,
  AuditLogEvent.IntegrationDelete,
  AuditLogEvent.StageInstanceDelete,
  AuditLogEvent.GuildScheduledEventDelete,
  AuditLogEvent.SoundboardSoundDelete,
  AuditLogEvent.AutoModerationRuleDelete,
  AuditLogEvent.AutoModerationUserCommunicationDisabled,
  AuditLogEvent.AutoModerationQuarantineUser,
]);

const toSnakeCase = (value) => {
  if (!value) {
    return 'unknown';
  }
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .replace(/__+/g, '_')
    .toLowerCase();
};

const toTitleCase = (value) => {
  if (!value) {
    return 'Unbekannte Aktion';
  }
  const spaced = value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();
  if (!spaced) {
    return 'Unbekannte Aktion';
  }
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

const summariseChangeKeys = (changes) => {
  if (!Array.isArray(changes) || changes.length === 0) {
    return null;
  }

  const uniqueKeys = [];
  for (const change of changes) {
    if (!change || typeof change !== 'object' || !change.key) {
      continue;
    }
    const formattedKey = formatMetadataKey(change.key);
    if (!formattedKey) {
      continue;
    }
    if (!uniqueKeys.includes(formattedKey)) {
      uniqueKeys.push(formattedKey);
    }
  }

  if (uniqueKeys.length === 0) {
    return null;
  }

  const MAX_KEYS = 3;
  const displayed = uniqueKeys.slice(0, MAX_KEYS);
  let summary = displayed.join(', ');
  const remaining = uniqueKeys.length - displayed.length;
  if (remaining > 0) {
    summary += ` +${remaining}`;
  }

  return `${summary} geändert`;
};

const extractExtraDetails = (extra) => {
  if (!extra || typeof extra !== 'object') {
    return { channelId: null, count: null };
  }

  const details = { channelId: null, count: null };

  const resolveId = (value) => {
    if (!value) {
      return null;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed ? trimmed : null;
    }
    if (typeof value === 'number' || typeof value === 'bigint') {
      return String(value);
    }
    return null;
  };

  const channelId =
    resolveId(extra.channel?.id) ??
    resolveId(extra.channelId) ??
    resolveId(extra.guild?.id);
  if (channelId) {
    details.channelId = channelId;
  }

  const countKeys = ['count', 'removed', 'membersRemoved', 'messagesDeleted'];
  for (const key of countKeys) {
    if (typeof extra[key] === 'number' && Number.isFinite(extra[key])) {
      details.count = extra[key];
      break;
    }
  }

  return details;
};

const ACTION_EMOJI_RULES = [
  { check: (key) => key?.includes('bulk_delete'), emoji: '🧹' },
  {
    check: (key) =>
      key?.includes('kick') || key?.includes('prune') || key?.includes('disconnect') || key?.includes('move'),
    emoji: '👢',
  },
  { check: (key) => key?.includes('ban'), emoji: '🔨' },
  { check: (key) => key?.includes('delete'), emoji: '🗑️' },
  { check: (key) => key?.includes('create'), emoji: '🆕' },
  { check: (key) => key?.includes('update') || key?.includes('overwrite'), emoji: '✏️' },
];

const DEFAULT_EMOJI = 'ℹ️';

const getActionEmoji = (actionKey) => {
  if (!actionKey) {
    return DEFAULT_EMOJI;
  }
  const lower = actionKey.toLowerCase();
  for (const { check, emoji } of ACTION_EMOJI_RULES) {
    if (check(lower)) {
      return emoji;
    }
  }
  return DEFAULT_EMOJI;
};

const determineVerb = (actionKey) => {
  if (!actionKey) {
    return null;
  }
  const lower = actionKey.toLowerCase();
  if (lower.includes('bulk_delete')) {
    return 'bulk_delete';
  }
  if (
    lower.includes('kick') ||
    lower.includes('prune') ||
    lower.includes('disconnect') ||
    lower.includes('move')
  ) {
    return 'kick';
  }
  if (lower.includes('ban')) {
    return lower.includes('remove') ? 'unban' : 'ban';
  }
  if (/_delete$/.test(lower)) {
    return 'delete';
  }
  if (/_create$/.test(lower)) {
    return 'create';
  }
  if (/_update$/.test(lower) || lower.includes('overwrite')) {
    return 'update';
  }
  return null;
};

const SUBJECT_LABELS = {
  channel: 'Channel',
  role: 'Rolle',
  member: 'Mitglied',
  user: 'User',
  message: 'Nachricht',
  messages: 'Nachrichten',
  webhook: 'Webhook',
  emoji: 'Emoji',
  sticker: 'Sticker',
  integration: 'Integration',
  thread: 'Thread',
  stage: 'Stage',
  stage_instance: 'Stage',
  guild_scheduled_event: 'Event',
  soundboard_sound: 'Sound',
  auto_moderation_rule: 'AutoMod-Regel',
  application_command: 'Command',
};

const VERB_PARTS = new Set([
  'create',
  'delete',
  'update',
  'add',
  'remove',
  'kick',
  'ban',
  'bulk',
  'prune',
  'move',
  'disconnect',
  'enable',
  'disable',
]);

const getSubjectParts = (actionKey) => {
  if (!actionKey) {
    return [];
  }
  const segments = actionKey.split('_').filter(Boolean);
  while (segments.length && VERB_PARTS.has(segments[segments.length - 1])) {
    segments.pop();
  }
  return segments;
};

const formatSubjectLabel = (actionKey, verb) => {
  const parts = getSubjectParts(actionKey);
  if (!parts.length) {
    return toTitleCase(actionKey);
  }

  const joined = parts.join('_');
  if (verb === 'bulk_delete' && parts[parts.length - 1] === 'message') {
    return 'Nachrichten';
  }
  if (SUBJECT_LABELS[joined]) {
    return SUBJECT_LABELS[joined];
  }
  const last = parts[parts.length - 1];
  if (SUBJECT_LABELS[last]) {
    return SUBJECT_LABELS[last];
  }
  return parts.map((part) => toTitleCase(part)).join(' ');
};

export default {
  name: Events.GuildAuditLogEntryCreate,
  once: false,
  async execute(entry, guild) {
    try {
      const {
        action,
        actionType,
        executorId,
        executor,
        target,
        targetId,
        targetType,
        reason,
        extra,
        changes,
      } = entry;

      const actionName = typeof action === 'number' ? AuditLogEvent[action] : typeof action === 'string' ? action : null;
      const actionKey = toSnakeCase(actionName ?? (typeof action === 'string' ? action : 'unknown'));
      const readableAction = toTitleCase(actionName ?? actionKey);
      const level = WARN_ACTIONS.has(action) || actionType === 'Delete' ? 'warn' : 'info';

      const metadata = { action: actionKey };
      const actorId = executorId ?? executor?.id ?? null;
      if (actorId) {
        metadata.actorId = actorId;
      }
      const resolvedTargetId = targetId ?? (typeof target?.id === 'string' ? target.id : null);
      if (resolvedTargetId) {
        metadata.targetId = resolvedTargetId;
      }
      const reasonText = typeof reason === 'string' ? reason.trim() : '';
      if (reasonText) {
        metadata.reason = reasonText;
      }

      const targetDescription =
        describeDiscordEntity(target) ?? (resolvedTargetId ? `ID ${resolvedTargetId}` : null);
      if (targetDescription) {
        metadata.targetLabel = targetDescription;
      }

      const createTargetMention = () => {
        if (!resolvedTargetId) {
          return null;
        }
        switch (targetType) {
          case 'User':
          case 'Member':
          case 'Owner':
            return `<@${resolvedTargetId}>`;
          case 'Role':
            return `<@&${resolvedTargetId}>`;
          case 'Channel':
          case 'Thread':
          case 'StageInstance':
            return `<#${resolvedTargetId}>`;
          default:
            return null;
        }
      };

      const targetMention = createTargetMention();
      if (targetMention) {
        metadata.targetMention = targetMention;
      }

      const actorLabel = describeDiscordEntity(executor);
      if (actorLabel) {
        metadata.actorLabel = actorLabel;
      }

      const extraDetails = extractExtraDetails(extra);
      if (extraDetails.channelId) {
        metadata.channelId = extraDetails.channelId;
      }

      const changeSummary = summariseChangeKeys(changes);
      const verb = determineVerb(actionKey);
      const subjectLabel = formatSubjectLabel(actionKey, verb);
      const emoji = getActionEmoji(actionKey);

      const channelMention = extraDetails.channelId ? `<#${extraDetails.channelId}>` : null;
      const targetDisplay = targetMention ?? targetDescription ?? (resolvedTargetId ? `ID ${resolvedTargetId}` : '—');

      let descriptionCore;
      switch (verb) {
        case 'bulk_delete': {
          const location = channelMention ?? (targetMention?.startsWith('<#') ? targetMention : null) ?? targetDisplay;
          const countSuffix = typeof extraDetails.count === 'number' ? ` (${extraDetails.count})` : '';
          descriptionCore = `Nachrichten gelöscht in ${location ?? '—'}${countSuffix}`;
          break;
        }
        case 'delete':
          descriptionCore = `${subjectLabel} gelöscht: ${targetDisplay}`;
          break;
        case 'create':
          descriptionCore = `${subjectLabel} erstellt: ${targetDisplay}`;
          break;
        case 'update':
          descriptionCore = `${subjectLabel} aktualisiert: ${targetDisplay}`;
          break;
        case 'kick':
          descriptionCore = `Kick: ${targetDisplay}`;
          break;
        case 'ban':
          descriptionCore = `Ban: ${targetDisplay}`;
          break;
        case 'unban':
          descriptionCore = `Unban: ${targetDisplay}`;
          break;
        default:
          descriptionCore = `${subjectLabel}: ${targetDisplay}`;
          break;
      }

      let description = `${emoji} ${descriptionCore}`.trim();
      if (changeSummary) {
        description += ` — ${changeSummary}`;
      }

      const actionLogger = actionKey ? auditLogger.withPrefix(actionKey) : auditLogger;
      actionLogger[level](description, metadata);
    } catch (err) {
      auditLogger.error('Verarbeitung des Audit-Log-Eintrags fehlgeschlagen:', err);
    }
  },
};
