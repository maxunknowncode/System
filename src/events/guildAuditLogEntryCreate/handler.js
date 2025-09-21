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
    summary += ` (+${remaining} weitere)`;
  }

  return `Änderungen: ${summary}`;
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

      const extraMetadata = {};
      const extraSummary = summariseExtra(extra, extraMetadata);
      const changeSummary = summariseChangeKeys(changes);

      const extraSegments = [];
      const channelId = extraMetadata.channelId;
      if (channelId) {
        extraSegments.push(`Kanal: <#${channelId}>`);
      }
      const filteredExtraSummary = extraSummary.filter((item) => !item.startsWith('Kanal:'));
      extraSegments.push(...filteredExtraSummary);
      const displayedExtra = extraSegments.slice(0, 2);

      const summarySegments = [];
      if (targetDescription) {
        summarySegments.push(`${readableAction}: ${targetDescription}`);
      } else if (resolvedTargetId) {
        summarySegments.push(`${readableAction}: ID ${resolvedTargetId}`);
      } else {
        summarySegments.push(readableAction);
      }

      if (displayedExtra.length) {
        summarySegments.push(displayedExtra.join(', '));
      }

      if (changeSummary) {
        summarySegments.push(changeSummary);
      }

      const description = summarySegments.filter(Boolean).join(' • ') || readableAction || 'Audit Log';

      const actionLogger = actionKey ? auditLogger.withPrefix(actionKey) : auditLogger;
      actionLogger[level](description, metadata);
    } catch (err) {
      auditLogger.error('Verarbeitung des Audit-Log-Eintrags fehlgeschlagen:', err);
    }
  },
};
