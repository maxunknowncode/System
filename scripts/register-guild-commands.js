// Zweck: Slash-Commands ausschließlich auf EINER Guild registrieren (privater Bot).
// ENV: process.env.CLIENT_ID (Application ID), process.env.GUILD_ID (Guild), process.env.TOKEN (Bot-Token).
// TODO: REST-Client aus 'discord.js' (REST, Routes) vorbereiten (nur Kommentar, keine Imports/Implementierung).
// TODO: Funktions-Signatur ohne Body:
// function registerGuildCommands({ applicationId, guildId, token }) { /* TODO: später REST-PUT an Routes.applicationGuildCommands */ }
// Hinweis: Keine globalen Commands registrieren. Nur Guild.
// Hinweis: Script manuell ausführen, wenn Commands hinzugefügt/geändert wurden (später).
