// Der Bot benötigt GuildMembers- und GuildPresences-Intents (siehe index.js)
import { CHANNEL_IDS } from '../../config/ids.js';

export const VOICESTATS_GUILD_ID = process.env.GUILD_ID;         // optional, falls nur 1 Guild
export const MEMBERS_CHANNEL_ID = CHANNEL_IDS.voiceStatsMembers; // 👥 Mitglieder
export const ONLINE_CHANNEL_ID  = CHANNEL_IDS.voiceStatsOnline;  // 🟢 Online
export const UPDATE_EVERY_MS    = 300000;                        // 5 Minuten
export const ONLINE_STATUSES    = ["online", "idle", "dnd"];     // was als „online“ zählt
