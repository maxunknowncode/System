import { PermissionsBitField } from 'discord.js';
import { randomUUID } from 'node:crypto';
import { coreEmbed } from '../../../util/embeds/core.js';
import { detectLangFromInteraction } from '../../../util/embeds/lang.js';
import { TEAM_ROLE_ID } from '../config.js';
import { ACTION, STATUS } from '../constants.js';
import { composeReasonText } from './composeReason.js';
import { sendUserDM } from './dm.js';
import { sendModLog } from './log.js';
import { attachAuditInfo } from './audit.js';
import {
  createCase,
  getCaseById,
  updateCaseDM,
  updateCaseReasonCodes,
  updateCaseCustomReason,
  updateCaseReasonText,
  updateCaseStatus,
  markCaseFailed,
} from '../storage/repo.js';

const REQUIRED_PERMISSIONS = {
  [ACTION.BAN]: PermissionsBitField.Flags.BanMembers,
  [ACTION.UNBAN]: PermissionsBitField.Flags.BanMembers,
  [ACTION.TIMEOUT]: PermissionsBitField.Flags.ModerateMembers,
  [ACTION.KICK]: PermissionsBitField.Flags.KickMembers,
  [ACTION.WARN]: null,
};

function buildResponseEmbed(interaction, lang) {
  return coreEmbed('ANN', lang);
}

function ensureGuild(interaction) {
  if (!interaction.guild) {
    throw new Error('Interaction ohne Guild');
  }
}

function getLanguage(interaction, providedLang) {
  if (providedLang) return providedLang;
  if (interaction) {
    return detectLangFromInteraction(interaction);
  }
  return 'en';
}

function calculateDuration(caseRecord, startTs) {
  if (!caseRecord) {
    return { permanent: false, endTs: null, durationMs: null, display: '—' };
  }
  if (caseRecord.permanent) {
    return { permanent: true, endTs: null, durationMs: null, display: 'Permanent' };
  }
  if (!caseRecord.endTs || !caseRecord.createdAt) {
    return { permanent: false, endTs: null, durationMs: null, display: '—' };
  }
  const durationMs = Math.max(caseRecord.endTs.getTime() - caseRecord.createdAt.getTime(), 0);
  const computedEnd = new Date(startTs.getTime() + durationMs);
  return {
    permanent: false,
    durationMs,
    endTs: computedEnd,
    display: formatDuration(durationMs),
  };
}

function formatDuration(ms) {
  if (!ms || Number.isNaN(ms) || ms <= 0) {
    return '—';
  }
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (!parts.length && seconds) parts.push(`${seconds}s`);
  return parts.join(' ');
}

export function hasTeamRole(member) {
  return Boolean(member?.roles?.cache?.has(TEAM_ROLE_ID));
}

export function compareHierarchy(invoker, target) {
  if (!invoker || !target) return true;
  if (invoker.guild?.ownerId === invoker.id) return true;
  const invokerHighest = invoker.roles?.highest;
  const targetHighest = target.roles?.highest;
  if (!invokerHighest || !targetHighest) return true;
  return invokerHighest.comparePositionTo(targetHighest) > 0;
}

export function compareBotHierarchy(guild, target) {
  if (!guild?.members?.me || !target) return true;
  const botHighest = guild.members.me.roles?.highest;
  const targetHighest = target.roles?.highest;
  if (!botHighest || !targetHighest) return true;
  return botHighest.comparePositionTo(targetHighest) > 0;
}

export async function executeAction(params) {
  const {
    interaction,
    caseId: providedCaseId,
    actionType,
    guild,
    moderator,
    targetMember,
    targetUser,
    reasonCodes,
    customReason,
    lang: explicitLang,
  } = params;

  ensureGuild(interaction ?? { guild });
  const language = getLanguage(interaction, explicitLang);
  const embed = buildResponseEmbed(interaction, language);

  if (!hasTeamRole(moderator)) {
    embed.setDescription(
      language === 'de'
        ? 'Du benötigst die Team-Rolle, um diesen Befehl zu nutzen.'
        : 'You need the team role to execute this command.'
    );
    return { ok: false, embed };
  }

  const requiredPermission = REQUIRED_PERMISSIONS[actionType];
  if (requiredPermission && !moderator.permissions?.has(requiredPermission)) {
    embed.setDescription(
      language === 'de'
        ? 'Dir fehlen die erforderlichen Discord-Berechtigungen.'
        : 'You are missing the required Discord permission.'
    );
    return { ok: false, embed };
  }

  if (requiredPermission && !guild.members.me?.permissions?.has(requiredPermission)) {
    embed.setDescription(
      language === 'de'
        ? 'Der Bot verfügt nicht über die nötigen Berechtigungen.'
        : 'The bot lacks the required permission to execute this action.'
    );
    return { ok: false, embed };
  }

  if (hasTeamRole(targetMember)) {
    embed.setDescription(
      language === 'de'
        ? 'Aktion blockiert: Ziel gehört zum Team.'
        : 'Action blocked: target is part of the team.'
    );
    return { ok: false, embed };
  }

  if (targetMember) {
    if (!compareHierarchy(moderator, targetMember)) {
      embed.setDescription(
        language === 'de'
          ? 'Du kannst keine Mitglieder mit gleicher oder höherer Rolle moderieren.'
          : 'You cannot moderate members with equal or higher role.'
      );
      return { ok: false, embed };
    }
    if (!compareBotHierarchy(guild, targetMember)) {
      embed.setDescription(
        language === 'de'
          ? 'Die Bot-Rolle ist nicht hoch genug, um diese Aktion auszuführen.'
          : 'The bot role hierarchy prevents this action.'
      );
      return { ok: false, embed };
    }
  }

  const caseId = providedCaseId ?? randomUUID();
  let caseRecord = providedCaseId ? await getCaseById(caseId) : null;

  if (!caseRecord) {
    caseRecord = await createCase({
      id: caseId,
      guildId: guild.id,
      userId: targetMember?.id ?? targetUser?.id,
      moderatorId: moderator.id,
      actionType,
      reasonCodes,
      customReason,
    });
  } else {
    if (reasonCodes) {
      await updateCaseReasonCodes(caseId, reasonCodes);
      caseRecord.reasonCodes = reasonCodes;
    }
    if (typeof customReason === 'string') {
      await updateCaseCustomReason(caseId, customReason);
      caseRecord.customReason = customReason;
    }
  }

  const effectiveReasonCodes = caseRecord.reasonCodes ?? reasonCodes ?? [];
  const effectiveCustom = caseRecord.customReason ?? customReason ?? '';

  if (!effectiveReasonCodes.length) {
    embed.setDescription(
      language === 'de'
        ? 'Bitte wähle mindestens einen Grund aus.'
        : 'Please select at least one reason.'
    );
    return { ok: false, embed };
  }

  if (caseRecord.userId === moderator.id) {
    embed.setDescription(
      language === 'de'
        ? 'Du kannst keine Aktion gegen dich selbst durchführen.'
        : 'You cannot run this action against yourself.'
    );
    return { ok: false, embed };
  }

  const botId = guild.client?.user?.id;
  if (botId && caseRecord.userId === botId) {
    embed.setDescription(
      language === 'de'
        ? 'Der Bot kann nicht Ziel dieser Aktion sein.'
        : 'The bot cannot be targeted with this action.'
    );
    return { ok: false, embed };
  }

  if (targetMember?.user?.bot || targetUser?.bot) {
    embed.setDescription(
      language === 'de'
        ? 'Bots können nicht mit diesem Ablauf moderiert werden.'
        : 'Bots cannot be moderated with this flow.'
    );
    return { ok: false, embed };
  }

  const reasonText = composeReasonText(effectiveReasonCodes, effectiveCustom, language);
  await updateCaseReasonText(caseId, reasonText);

  const startTs = new Date();
  const durationInfo = calculateDuration(caseRecord, startTs);

  const dmOk = await sendUserDM(caseRecord.userId, {
    client: guild.client,
    guildName: guild.name,
    actionType,
    reasonText,
    durationText: durationInfo.permanent
      ? language === 'de'
        ? 'Permanent'
        : 'Permanent'
      : durationInfo.display,
    caseId,
  }, language);
  await updateCaseDM(caseId, dmOk);

  const auditReason = `${reasonText} | Case #${caseId}`.slice(0, 512);
  const targetId = caseRecord.userId;
  const result = { ok: true, embed, caseId, reasonText, dmOk };

  try {
    switch (actionType) {
      case ACTION.BAN: {
        await guild.members.ban(targetId, {
          reason: auditReason,
          deleteMessageSeconds: 86400,
        });
        break;
      }
      case ACTION.UNBAN: {
        await guild.members.unban(targetId, auditReason);
        break;
      }
      case ACTION.TIMEOUT: {
        if (!targetMember) {
          throw new Error('Target member missing for timeout');
        }
        if (!durationInfo.durationMs) {
          throw new Error('Timeout duration missing');
        }
        await targetMember.timeout(durationInfo.durationMs, auditReason);
        break;
      }
      case ACTION.KICK: {
        if (!targetMember) {
          throw new Error('Target member missing for kick');
        }
        await targetMember.kick(auditReason);
        break;
      }
      case ACTION.WARN: {
        // no external action, only persistence
        break;
      }
      default:
        throw new Error(`Unsupported action: ${actionType}`);
    }
  } catch (error) {
    await markCaseFailed(caseId);
    embed.setDescription(
      language === 'de'
        ? 'Die Moderationsaktion ist fehlgeschlagen.'
        : 'The moderation action failed.'
    );
    result.ok = false;
    result.embed = embed;
    result.error = error;
    return result;
  }

  const statusPayload = {
    startTs,
    endTs: durationInfo.endTs ?? null,
    permanent: durationInfo.permanent,
  };

  await updateCaseStatus(caseId, STATUS.ACTIVE, statusPayload);

  const auditId = await attachAuditInfo(guild, actionType, caseId);

  embed
    .setDescription(
      language === 'de'
        ? `Aktion erfolgreich abgeschlossen. Case #${caseId}`
        : `Action completed successfully. Case #${caseId}`
    );

  await sendModLog(
    guild,
    {
      actionType,
      caseId,
      target: targetMember?.user ?? targetUser ?? null,
      targetId,
      moderator: moderator.user ?? moderator,
      startTs,
      endTs: statusPayload.endTs,
      permanent: statusPayload.permanent,
      reasonText,
      dmOk,
      auditId,
    },
    language
  );

  result.embed = embed;
  return result;
}

export async function setPendingReasons(caseId, reasonCodes = [], _lang = 'en') {
  const sanitised = Array.from(
    new Set(
      (Array.isArray(reasonCodes) ? reasonCodes : [])
        .map((code) => (typeof code === 'string' ? code.trim().toUpperCase() : ''))
        .filter(Boolean)
    )
  ).slice(0, 5);
  return updateCaseReasonCodes(caseId, sanitised);
}

export async function setPendingCustomReason(caseId, text, _lang = 'en') {
  if (typeof text !== 'string') {
    return updateCaseCustomReason(caseId, null);
  }
  const trimmed = text.trim();
  const limited = trimmed ? trimmed.slice(0, 300) : null;
  return updateCaseCustomReason(caseId, limited);
}
