// Der Bot benötigt GuildMembers- und GuildPresences-Intents (siehe index.js)
export const VOICESTATS_GUILD_ID = process.env.GUILD_ID;         // optional, falls nur 1 Guild
export const MEMBERS_CHANNEL_ID = "1355272570848673895";         // 👥 Mitglieder
export const ONLINE_CHANNEL_ID  = "1355272617791193389";         // 🟢 Online
export const UPDATE_EVERY_MS    = 300000;                        // 5 Minuten
export const ONLINE_STATUSES    = ["online", "idle", "dnd"];     // was als „online“ zählt
