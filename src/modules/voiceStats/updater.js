/*
### Zweck: Aktualisiert Voice-Statistik-Kanäle für Mitglieder- und Onlinezahlen.
Der Bot benötigt in den Ziel-Kanälen die Berechtigung „Manage Channels“ zum Umbenennen.
*/
import {
  VOICESTATS_GUILD_ID,
  MEMBERS_CHANNEL_ID,
  ONLINE_CHANNEL_ID,
  UPDATE_EVERY_MS,
  ONLINE_STATUSES,
} from './config.js';
import { logger } from '../../util/logger.js';

let client;
let intervalStarted = false;
let presencesFetched = false;
let lastHumans = null;
let lastOnline = null;

async function computeCounts(guild) {
  if (!presencesFetched) {
    await guild.members.fetch({ withPresences: true });
    presencesFetched = true;
  }
  const humans = guild.members.cache.filter((m) => !m.user.bot).size;
  const online = guild.members.cache.filter(
    (m) =>
      !m.user.bot &&
      m.presence &&
      ONLINE_STATUSES.includes(m.presence.status)
  ).size;
  return { humans, online };
}

async function setChannelName(channelId, name) {
  try {
    const ch = await client.channels.fetch(channelId);
    if (ch && ch.name !== name) {
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
  if (!guild) return;
  const { humans, online } = await computeCounts(guild);
  if (humans !== lastHumans) {
    await setChannelName(MEMBERS_CHANNEL_ID, `👥 Mitglieder: ${humans}`);
    lastHumans = humans;
  }
  if (online !== lastOnline) {
    await setChannelName(ONLINE_CHANNEL_ID, `🟢 Online: ${online}`);
    lastOnline = online;
  }
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
