import { logger } from '../../../util/logging/logger.js';
import { ACTION, SUCCESS_COLOR } from '../constants.js';
import { findDueToLift, markLifted } from '../storage/repo.js';
import { sendModLog } from '../service/log.js';

const workerLogger = logger.withPrefix('moderation:worker');
const INTERVAL_MS = 3 * 60 * 1000;
let intervalHandle;

function detectLanguageFromGuild(guild) {
  const locale = guild?.preferredLocale ?? 'en';
  return typeof locale === 'string' && locale.toLowerCase().startsWith('de') ? 'de' : 'en';
}

async function processCase(client, guild, entry) {
  const lang = detectLanguageFromGuild(guild);
  let lifted = false;
  const reason = lang === 'de' ? `Automatisch aufgehoben (Case #${entry.id}).` : `Automatically lifted (Case #${entry.id}).`;

  try {
    if (entry.actionType === ACTION.TIMEOUT) {
      const member = await guild.members.fetch(entry.userId).catch(() => null);
      if (member) {
        await member.timeout(null, reason);
        lifted = true;
      }
    } else if (entry.actionType === ACTION.BAN) {
      try {
        await guild.members.unban(entry.userId, reason);
        lifted = true;
      } catch (err) {
        if (err?.code === 10026) {
          lifted = true;
        } else {
          workerLogger.warn('Unban im Worker fehlgeschlagen:', err);
        }
      }
    }
  } catch (error) {
    workerLogger.warn('Fehler beim Aufheben:', error);
  }

  if (!lifted) {
    return;
  }

  await markLifted(entry.id);

  const targetUser = await client.users.fetch(entry.userId).catch(() => null);
  const moderator = guild.members.me?.user ?? client.user;

  await sendModLog(
    guild,
    {
      actionType: `${entry.actionType}_LIFT`,
      caseId: entry.id,
      target: targetUser,
      targetId: entry.userId,
      moderator,
      startTs: entry.startTs ?? new Date(),
      endTs: entry.endTs ?? new Date(),
      permanent: false,
      reasonText:
        lang === 'de'
          ? 'Maßnahme automatisch aufgehoben (Dauer abgelaufen).'
          : 'Action lifted automatically (duration expired).',
      dmOk: entry.dmOk,
      auditId: entry.auditId,
      color: SUCCESS_COLOR,
    },
    lang
  );
}

async function runCycle(client) {
  const entries = await findDueToLift();
  if (!entries.length) {
    return;
  }

  for (const entry of entries) {
    const guild = await client.guilds.fetch(entry.guildId).catch(() => null);
    if (!guild) {
      workerLogger.warn('Guild nicht erreichbar für Case', entry.id);
      continue;
    }
    await processCase(client, guild, entry);
  }
}

export function startModerationScheduler(client) {
  if (intervalHandle) {
    return;
  }
  intervalHandle = setInterval(() => {
    runCycle(client).catch((error) => workerLogger.error('Worker-Fehler:', error));
  }, INTERVAL_MS);
  intervalHandle.unref?.();
  runCycle(client).catch((error) => workerLogger.error('Worker-Fehler:', error));
}

export function stopModerationScheduler() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = undefined;
  }
}
