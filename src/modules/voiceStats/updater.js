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

const voiceStatsLogger = logger.withPrefix('voice-stats:updater');

let client;
let intervalStarted = false;
let presencesFetched = false;
let presencesSupported = true;
let updateInProgress = false;
let lastHumans = null;
let lastOnline = null;
let membersChannel;
let onlineChannel;

async function computeCounts(guild) {
  if (presencesSupported && !presencesFetched) {
    try {
      await guild.members.fetch({ withPresences: true });
      presencesFetched = true;
    } catch (err) {
      presencesSupported = false;
      voiceStatsLogger.warn('Presence-Informationen nicht verfügbar – Online-Zählung wird übersprungen.', err);
    }
  }

  const humans = guild.members.cache.filter((m) => !m.user.bot).size;
  let online = null;
  if (presencesSupported) {
    online = guild.members.cache.filter(
      (m) =>
        !m.user.bot &&
        m.presence &&
        ONLINE_STATUSES.includes(m.presence.status)
    ).size;
  }

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
  if (updateInProgress) {
    return;
  }
  updateInProgress = true;
  const guild = VOICESTATS_GUILD_ID
    ? client.guilds.cache.get(VOICESTATS_GUILD_ID)
    : client.guilds.cache.first();
  if (!guild) {
    updateInProgress = false;
    return;
  }
  try {
    const { humans, online } = await computeCounts(guild);
    if (membersChannel && humans !== lastHumans) {
      await setChannelName(membersChannel, `👥 Members: ${humans}`);
      lastHumans = humans;
    }
    if (onlineChannel && online != null && online !== lastOnline) {
      await setChannelName(onlineChannel, `🟢 Online: ${online}`);
      lastOnline = online;
    }
  } finally {
    updateInProgress = false;
  }
}

export async function startVoiceStats(c) {
  if (intervalStarted) return;
  intervalStarted = true;
  client = c;
  membersChannel = null;
  onlineChannel = null;
  if (MEMBERS_CHANNEL_ID) {
    try {
      const channel = await client.channels.fetch(MEMBERS_CHANNEL_ID);
      if (channel?.isVoiceBased?.()) {
        membersChannel = channel;
      } else {
        voiceStatsLogger.warn(`Mitglieder-Kanal ${MEMBERS_CHANNEL_ID} ist nicht verfügbar oder kein Voice-Kanal.`);
      }
    } catch (err) {
      voiceStatsLogger.warn('Mitglieder-Kanal konnte nicht geladen werden:', err);
    }
  }
  if (ONLINE_CHANNEL_ID) {
    try {
      const channel = await client.channels.fetch(ONLINE_CHANNEL_ID);
      if (channel?.isVoiceBased?.()) {
        onlineChannel = channel;
      } else {
        voiceStatsLogger.warn(`Online-Kanal ${ONLINE_CHANNEL_ID} ist nicht verfügbar oder kein Voice-Kanal.`);
      }
    } catch (err) {
      voiceStatsLogger.warn('Online-Kanal konnte nicht geladen werden:', err);
    }
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
