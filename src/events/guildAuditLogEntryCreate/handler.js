/*
### Zweck: Überwacht neue Audit-Log-Einträge und leitet sie strukturiert an den Logger weiter.
*/
import { AuditLogEvent } from 'discord-api-types/v10';
import { Events } from 'discord.js';
import { logger } from '../../util/logger.js';
import {
  describeDiscordEntity,
  formatMetadataKey,
  formatValue,
  isPlainObject,
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

const summariseChanges = (changes) => {
  if (!Array.isArray(changes) || changes.length === 0) {
    return { items: [], remaining: 0 };
  }
  const MAX_CHANGES = 4;
  const relevant = changes.slice(0, MAX_CHANGES);
  const items = relevant.map((change) => {
    const hasOld = Object.prototype.hasOwnProperty.call(change, 'old');
    const hasNew = Object.prototype.hasOwnProperty.call(change, 'new');
    const formattedOld = hasOld ? formatValue(change.old) : null;
    const formattedNew = hasNew ? formatValue(change.new) : null;

    if (hasOld && hasNew) {
      if (formattedOld === formattedNew) {
        return `${change.key}: ${formattedNew}`;
      }
      return `${change.key}: ${formattedOld} → ${formattedNew}`;
    }
    if (hasNew) {
      return `${change.key}: ${formattedNew}`;
    }
    if (hasOld) {
      return `${change.key}: ${formattedOld}`;
    }
    return change.key;
  });

  return {
    items,
    remaining: Math.max(0, changes.length - relevant.length),
  };
};

const summariseExtra = (extra, metadata) => {
  if (extra == null) {
    return [];
  }

  const summary = [];
  const handled = new Set();

  if (typeof extra === 'object') {
    if ('channel' in extra) {
      const channel = extra.channel;
      const channelId = channel?.id ?? extra.channelId ?? null;
      if (channelId) {
        if (!metadata.channelId) {
          metadata.channelId = String(channelId);
        }
        const label = describeDiscordEntity(channel) ?? `#${channelId}`;
        summary.push(`Kanal: ${label}`);
      }
      handled.add('channel');
    }

    if ('channelId' in extra && extra.channelId && !metadata.channelId) {
      metadata.channelId = String(extra.channelId);
      handled.add('channelId');
    }

    const mappedFields = [
      ['count', 'Anzahl'],
      ['removed', 'Entfernt'],
      ['membersRemoved', 'Entfernt'],
      ['days', 'Tage'],
      ['deleteMemberDays', 'Tage'],
      ['integrationType', 'Integration'],
      ['autoModerationRuleName', 'Regel'],
      ['autoModerationRuleTriggerType', 'Trigger'],
      ['messageId', 'Nachricht'],
      ['applicationId', 'Application'],
    ];

    for (const [key, label] of mappedFields) {
      if (extra[key] == null) {
        continue;
      }
      handled.add(key);
      metadata[key] = extra[key];
      summary.push(`${label}: ${formatValue(extra[key])}`);
    }

    if ('id' in extra && extra.id != null) {
      metadata.extraId = extra.id;
      handled.add('id');
      const label = describeDiscordEntity(extra);
      if (label) {
        summary.push(`Bezug: ${label}`);
      }
    }

    if (!handled.has('user') && extra.user) {
      const label = describeDiscordEntity(extra.user);
      if (label) {
        summary.push(`Bezug: ${label}`);
      }
      handled.add('user');
    }

    if (isPlainObject(extra)) {
      for (const [key, value] of Object.entries(extra)) {
        if (handled.has(key) || value == null) {
          continue;
        }
        metadata[key] = value;
        summary.push(`${formatMetadataKey(key)}: ${formatValue(value)}`);
      }
    }

    return summary;
  }

  metadata.extra = extra;
  summary.push(`Zusatzdaten: ${formatValue(extra)}`);
  return summary;
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
        id,
      } = entry;

      const actionName = typeof action === 'number' ? AuditLogEvent[action] : typeof action === 'string' ? action : null;
      const actionKey = toSnakeCase(actionName ?? (typeof action === 'string' ? action : 'unknown'));
      const readableAction = toTitleCase(actionName ?? actionKey);
      const level = WARN_ACTIONS.has(action) || actionType === 'Delete' ? 'warn' : 'info';

      const metadata = { action: actionKey };
      if (actionType) {
        metadata.actionType = actionType;
      }
      if (id) {
        metadata.entryId = id;
      }
      if (guild?.id) {
        metadata.guildId = guild.id;
      }
      const actorId = executorId ?? executor?.id ?? null;
      if (actorId) {
        metadata.actorId = actorId;
      }
      const resolvedTargetId = targetId ?? (typeof target?.id === 'string' ? target.id : null);
      if (resolvedTargetId) {
        metadata.targetId = resolvedTargetId;
      }
      if (targetType) {
        metadata.targetType = targetType;
      }
      if (reason) {
        metadata.reason = reason;
      }

      const targetDescription =
        describeDiscordEntity(target) ?? (resolvedTargetId ? `ID ${resolvedTargetId}` : null);
      const changeSummary = summariseChanges(changes);
      const extraSummary = summariseExtra(extra, metadata);

      if (!metadata.channelId && targetType && ['Channel', 'Thread', 'StageInstance'].includes(targetType) && target?.id) {
        metadata.channelId = String(target.id);
      }

      const parts = [];
      const actionTypeLabel = actionType ? ` (${actionType})` : '';
      parts.push(`Aktion ${readableAction}${actionTypeLabel}`);

      if (targetDescription || targetType) {
        const typeHint = targetType && targetType !== 'Unknown' ? ` [${targetType}]` : '';
        parts.push(`Ziel${typeHint}: ${targetDescription ?? 'Unbekannt'}`);
      }

      if (changeSummary.items.length) {
        const suffix = changeSummary.remaining ? ` (+${changeSummary.remaining} weitere)` : '';
        parts.push(`Änderungen: ${changeSummary.items.join('; ')}${suffix}`);
      }

      if (extraSummary.length) {
        parts.push(`Details: ${extraSummary.join('; ')}`);
      }

      const description = parts.filter(Boolean).join(' • ') || 'Neuer Audit-Log-Eintrag';

      const actionLogger = actionKey ? auditLogger.withPrefix(actionKey) : auditLogger;
      actionLogger[level](description, metadata);
    } catch (err) {
      auditLogger.error('Verarbeitung des Audit-Log-Eintrags fehlgeschlagen:', err);
    }
  },
};
