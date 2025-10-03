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
import { logger } from '../../util/logging/logger.js';

const voiceStatsLogger = logger.withPrefix('voicestats');

let client;
let intervalStarted = false;
let presencesFetched = false;
let lastHumans = null;
let lastOnline = null;
let membersChannel;
let onlineChannel;

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

async function setChannelName(channel, name) {
  try {
    if (channel && channel.name !== name) {
      await channel.setName(name);
    }
  } catch (err) {
    voiceStatsLogger.error('Fehler beim Umbenennen des Kanals:', err);
  }
}

async function tick() {
  const guild = VOICESTATS_GUILD_ID
    ? client.guilds.cache.get(VOICESTATS_GUILD_ID)
    : client.guilds.cache.first();
  if (!guild) return;
  const { humans, online } = await computeCounts(guild);
  if (membersChannel && humans !== lastHumans) {
    await setChannelName(membersChannel, `👥 Mitglieder: ${humans}`);
    lastHumans = humans;
  }
  if (onlineChannel && online !== lastOnline) {
    await setChannelName(onlineChannel, `🟢 Online: ${online}`);
    lastOnline = online;
  }
}

export async function startVoiceStats(c) {
  if (intervalStarted) return;
  intervalStarted = true;
  client = c;
  try {
    membersChannel = await client.channels.fetch(MEMBERS_CHANNEL_ID);
    onlineChannel = await client.channels.fetch(ONLINE_CHANNEL_ID);
  } catch (err) {
    voiceStatsLogger.error('Kanäle konnten nicht abgerufen werden:', err);
  }
  try {
    await tick();
  } catch (err) {
    voiceStatsLogger.error('Fehler beim Aktualisieren der Voice-Stats:', err);
  }
  const interval = setInterval(async () => {
    try {
      await tick();
    } catch (err) {
      voiceStatsLogger.error('Fehler beim Aktualisieren der Voice-Stats:', err);
    }
  }, UPDATE_EVERY_MS);
  const stop = () => clearInterval(interval);
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}
