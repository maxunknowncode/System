/*
### Zweck: Aktualisiert Voice-Statistik-Kanäle für Mitglieder- und Onlinezahlen.
Der Bot benötigt in den Ziel-Kanälen die Berechtigung „Manage Channels“ zum Umbenennen.
*/
import { VOICESTATS_GUILD_ID, MEMBERS_CHANNEL_ID, ONLINE_CHANNEL_ID, UPDATE_EVERY_MS, ONLINE_STATUSES } from './config.js';
import { logger } from '../../util/logger.js';

let client;
let intervalStarted = false;

async function computeCounts(guild) {
  await guild.members.fetch();
  const humans = guild.members.cache.filter((m) => !m.user.bot).size;
  await guild.members.fetch({ withPresences: true });
  const online = guild.members.cache.filter(
    (m) => !m.user.bot && m.presence && ONLINE_STATUSES.includes(m.presence.status)
  ).size;
  return { humans, online };
}

async function setChannelName(channelId, name) {
  try {
    const ch = await client.channels.fetch(channelId);
    if (!ch) {
      logger.warn(`[voicestats] Kanal nicht gefunden: ${channelId}`);
      return;
    }
    if (ch.name !== name) {
      await ch.setName(name);
    }
  } catch (err) {
    logger.error('[voicestats] Fehler beim Umbenennen des Kanals:', err);
  }
}

async function tick() {
  const guild = VOICESTATS_GUILD_ID
    ? client.guilds.cache.get(VOICESTATS_GUILD_ID)
    : client.guilds.cache.first();
  if (!guild) {
    logger.warn('[voicestats] Guild nicht gefunden');
    return;
  }
  const { humans, online } = await computeCounts(guild);
  await setChannelName(MEMBERS_CHANNEL_ID, `👥 Mitglieder: ${humans}`);
  await setChannelName(ONLINE_CHANNEL_ID, `🟢 Online: ${online}`);
}

export async function startVoiceStats(c) {
  if (intervalStarted) return;
  intervalStarted = true;
  client = c;
  try {
    await tick();
  } catch (err) {
    logger.error('[voicestats] Fehler beim Aktualisieren der Voice-Stats:', err);
  }
  const interval = setInterval(async () => {
    try {
      await tick();
    } catch (err) {
      logger.error('[voicestats] Fehler beim Aktualisieren der Voice-Stats:', err);
    }
  }, UPDATE_EVERY_MS);
  const stop = () => clearInterval(interval);
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}
