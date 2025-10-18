/*
### Zweck: READY-Event – loggt Anmeldung und stößt die Verify-, Regeln- und Teamlisten-Nachrichten-Prüfung an.
*/
import { ChannelType } from 'discord.js';
import ensureVerifyMessage from '../../modules/verify/ensure.js';
import { ensureRulesMessage } from '../../modules/rules/ensure.js';
import { ensureTeamMessage } from '../../modules/teamlist/ensure.js';
import { startVoiceStats } from '../../modules/voiceStats/updater.js';
import { ensureTicketPanel } from '../../modules/tickets/ensure.js';
import { logger } from '../../util/logging/logger.js';
import { JOIN_TO_CREATE_CHANNEL_ID } from '../../modules/join2create/config.js';

const readyLogger = logger.withPrefix('lifecycle:ready');
const verifyLogger = logger.withPrefix('verify:ensure');
const rulesLogger = logger.withPrefix('rules:ensure');
const teamLogger = logger.withPrefix('team:ensure');
const voiceStatsLogger = logger.withPrefix('voice-stats:init');
const ticketsLogger = logger.withPrefix('tickets:ensure');
const joinCleanupLogger = logger.withPrefix('join2create:cleanup');

async function cleanupJoinChannels(client) {
  if (!JOIN_TO_CREATE_CHANNEL_ID) {
    return;
  }

  try {
    const baseChannel = await client.channels.fetch(JOIN_TO_CREATE_CHANNEL_ID);
    if (!baseChannel || baseChannel.type !== ChannelType.GuildVoice) {
      joinCleanupLogger.warn('Basis-Kanal für Bereinigung nicht verfügbar.');
      return;
    }

    const guild = baseChannel.guild;
    const siblings = guild.channels.cache.filter(
      (channel) =>
        channel.type === ChannelType.GuildVoice &&
        channel.parentId === baseChannel.parentId &&
        channel.id !== JOIN_TO_CREATE_CHANNEL_ID &&
        channel.name.startsWith('🔊 '),
    );

    for (const channel of siblings.values()) {
      if (channel.members.size > 0) {
        continue;
      }
      try {
        await channel.delete('Join-to-Create cleanup');
        joinCleanupLogger.info(`Temporären Kanal ${channel.id} bereinigt.`);
      } catch (err) {
        joinCleanupLogger.warn(`Bereinigung von ${channel.id} fehlgeschlagen:`, err);
      }
    }
  } catch (err) {
    joinCleanupLogger.warn('Bereinigung nicht möglich:', err);
  }
}

export default {
  name: 'ready',
  once: true,
  async execute(client) {
    readyLogger.info(`Angemeldet als ${client.user?.tag}`);
    try {
      await ensureVerifyMessage(client);
    } catch (err) {
      verifyLogger.error('Fehler beim Sicherstellen der Nachricht:', err);
    }
    try {
      await ensureRulesMessage(client);
    } catch (err) {
      rulesLogger.error('Fehler beim Sicherstellen der Nachricht:', err);
    }
    try {
      await ensureTeamMessage(client);
    } catch (err) {
      teamLogger.error('Fehler beim Sicherstellen der Nachricht:', err);
    }
    try {
      await startVoiceStats(client);
    } catch (err) {
      voiceStatsLogger.error('Fehler beim Starten:', err);
    }
    try {
      await ensureTicketPanel(client);
    } catch (err) {
      ticketsLogger.error('Fehler beim Sicherstellen des Panels:', err);
    }
    await cleanupJoinChannels(client);
  },
};
