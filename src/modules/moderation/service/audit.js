import { AuditLogEvent } from 'discord.js';
import { logger } from '../../../util/logging/logger.js';
import { ACTION } from '../constants.js';
import { getCaseById, updateCaseAudit } from '../storage/repo.js';

const auditLogger = logger.withPrefix('moderation:audit');

const AUDIT_EVENT_MAP = {
  [ACTION.BAN]: AuditLogEvent.MemberBanAdd,
  [ACTION.UNBAN]: AuditLogEvent.MemberBanRemove,
  [ACTION.TIMEOUT]: AuditLogEvent.MemberUpdate,
  [ACTION.KICK]: AuditLogEvent.MemberKick,
  [ACTION.WARN]: null,
};

export async function attachAuditInfo(guild, actionType, caseId) {
  if (!guild || !caseId) return null;
  const caseRecord = await getCaseById(caseId);
  if (!caseRecord) return null;

  const type = AUDIT_EVENT_MAP[actionType];
  if (!type) {
    return null;
  }

  try {
    const audit = await guild.fetchAuditLogs({ limit: 5, type });
    const entry = Array.from(audit.entries.values()).find((item) => item.target?.id === caseRecord.userId);
    if (entry) {
      await updateCaseAudit(caseId, entry.id);
      return entry.id;
    }
  } catch (error) {
    auditLogger.warn('Failed to fetch audit log entry:', error);
  }
  return null;
}
