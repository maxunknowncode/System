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

  const me = guild.members.me;
  if (!me?.permissions?.has('ViewAuditLog')) {
    auditLogger.warn(`Keine AuditLog-Berechtigung für ${guild.id} – Fall ${caseId} wird ohne Link fortgesetzt.`);
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
    auditLogger.warn(`AuditLog konnte nicht geladen werden (Fall ${caseId}):`, error);
  }
  return null;
}
